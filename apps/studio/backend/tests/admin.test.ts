import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, seedActiveUser } from './helpers/test-app.js';

async function loginAs(
  app: Awaited<ReturnType<typeof buildTestApp>>['app'],
  email: string,
  password: string,
) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

describe('admin users', () => {
  it('returns 401 without a session', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 403 for a normal user', async () => {
    const { app, users } = await buildTestApp();
    await seedActiveUser(users, {
      email: 'user@example.com',
      fullName: 'Normal User',
      password: 'password1234',
    });
    const agent = await loginAs(app, 'user@example.com', 'password1234');
    const res = await agent.get('/api/admin/users');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('lists filters and counts; approve sets approvedAt/By', async () => {
    const { app, users } = await buildTestApp();
    const admin = await seedActiveUser(users, {
      email: 'admin@example.com',
      fullName: 'Admin',
      password: 'password1234',
      role: 'admin',
    });
    const pending = await seedActiveUser(users, {
      email: 'pending@example.com',
      fullName: 'Pending Person',
      password: 'password1234',
      status: 'pending',
    });
    await seedActiveUser(users, {
      email: 'active@example.com',
      fullName: 'Active Person',
      password: 'password1234',
    });

    const agent = await loginAs(app, 'admin@example.com', 'password1234');
    const list = await agent.get('/api/admin/users?status=pending');
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.counts.pending).toBe(1);
    expect(list.body.counts.active).toBe(2);
    expect(list.body.items[0].email).toBe('pending@example.com');

    const approve = await agent
      .patch(`/api/admin/users/${pending.id}`)
      .send({ status: 'active' });
    expect(approve.status).toBe(200);
    expect(approve.body.user.status).toBe('active');

    const stored = await users.findById(pending.id);
    expect(stored?.approvedAt).toBeInstanceOf(Date);
    expect(stored?.approvedBy).toBe(admin.id);
  });

  it('reject, re-enable, cannot target self or admin; disable clears sessions', async () => {
    const { app, users, sessions } = await buildTestApp();
    const admin = await seedActiveUser(users, {
      email: 'admin@example.com',
      fullName: 'Admin',
      password: 'password1234',
      role: 'admin',
    });
    const otherAdmin = await seedActiveUser(users, {
      email: 'other-admin@example.com',
      fullName: 'Other Admin',
      password: 'password1234',
      role: 'admin',
    });
    const pending = await seedActiveUser(users, {
      email: 'pending@example.com',
      fullName: 'Pending',
      password: 'password1234',
      status: 'pending',
    });
    const active = await seedActiveUser(users, {
      email: 'active@example.com',
      fullName: 'Active',
      password: 'password1234',
    });

    const agent = await loginAs(app, 'admin@example.com', 'password1234');

    const reject = await agent
      .patch(`/api/admin/users/${pending.id}`)
      .send({ status: 'disabled' });
    expect(reject.status).toBe(200);
    expect(reject.body.user.status).toBe('disabled');

    const reenable = await agent
      .patch(`/api/admin/users/${pending.id}`)
      .send({ status: 'active' });
    expect(reenable.status).toBe(200);
    expect(reenable.body.user.status).toBe('active');

    const self = await agent
      .patch(`/api/admin/users/${admin.id}`)
      .send({ status: 'disabled' });
    expect(self.status).toBe(403);

    const targetAdmin = await agent
      .patch(`/api/admin/users/${otherAdmin.id}`)
      .send({ status: 'disabled' });
    expect(targetAdmin.status).toBe(403);

    // Give the active user a session, then disable.
    const userAgent = await loginAs(app, 'active@example.com', 'password1234');
    expect(sessions.countForUser(active.id)).toBe(1);
    const disable = await agent
      .patch(`/api/admin/users/${active.id}`)
      .send({ status: 'disabled' });
    expect(disable.status).toBe(200);
    expect(sessions.countForUser(active.id)).toBe(0);

    const me = await userAgent.get('/api/me');
    expect(me.status).toBe(401);
  });
});
