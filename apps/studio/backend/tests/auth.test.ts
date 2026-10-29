import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, seedActiveUser } from './helpers/test-app.js';

describe('auth', () => {
  it('registers a valid user as pending', async () => {
    const { app, users } = await buildTestApp();
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1234',
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'pending' });
    const stored = await users.findByEmail('ada@example.com');
    expect(stored?.status).toBe('pending');
    expect(stored?.role).toBe('user');
  });

  it('rejects duplicate email with EMAIL_TAKEN', async () => {
    const { app } = await buildTestApp();
    const body = {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password1234',
    };
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects bad input with VALIDATION_ERROR details', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'A',
      email: 'not-an-email',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('honeypot returns 201 and creates nothing', async () => {
    const { app, users } = await buildTestApp();
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Bot User',
      email: 'bot@example.com',
      password: 'password1234',
      website: 'https://spam.example',
    });
    expect(res.status).toBe(201);
    expect(await users.findByEmail('bot@example.com')).toBeNull();
  });

  it('login wrong password and unknown email share INVALID_CREDENTIALS', async () => {
    const { app, users } = await buildTestApp();
    await seedActiveUser(users, {
      email: 'ada@example.com',
      fullName: 'Ada',
      password: 'password1234',
    });

    const wrong = await request(app).post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'wrong-password',
    });
    const unknown = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password1234',
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknown.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('login pending and disabled after correct password', async () => {
    const { app, users } = await buildTestApp();
    await seedActiveUser(users, {
      email: 'pending@example.com',
      fullName: 'Pending',
      password: 'password1234',
      status: 'pending',
    });
    await seedActiveUser(users, {
      email: 'disabled@example.com',
      fullName: 'Disabled',
      password: 'password1234',
      status: 'disabled',
    });

    const pending = await request(app).post('/api/auth/login').send({
      email: 'pending@example.com',
      password: 'password1234',
    });
    const disabled = await request(app).post('/api/auth/login').send({
      email: 'disabled@example.com',
      password: 'password1234',
    });
    expect(pending.status).toBe(403);
    expect(pending.body.error.code).toBe('ACCOUNT_PENDING');
    expect(disabled.status).toBe(403);
    expect(disabled.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('active login sets cookie; /me and logout work', async () => {
    const { app, users } = await buildTestApp();
    await seedActiveUser(users, {
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      password: 'password1234',
    });

    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({
      email: 'ada@example.com',
      password: 'password1234',
    });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe('ada@example.com');
    expect(login.headers['set-cookie']).toBeDefined();

    const me = await agent.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.user.fullName).toBe('Ada Lovelace');

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const meAfter = await agent.get('/api/me');
    expect(meAfter.status).toBe(401);
    expect(meAfter.body.error.code).toBe('UNAUTHENTICATED');
  });
});
