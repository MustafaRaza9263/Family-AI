import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { User } from '../../src/models/user.model';
import { createFakeKnowledge, createPlainLlm } from '../helpers/fakes';
import {
  assertTestDatabase,
  clearCollections,
  setupTestMongo,
  teardownTestMongo,
} from '../helpers/mongo';

const hasTestDb = Boolean(assertTestDatabase());

describe.skipIf(!hasTestDb)('auth integration', () => {
  const app = createApp({
    llm: createPlainLlm(),
    knowledge: createFakeKnowledge(),
  });

  beforeAll(async () => {
    const ok = await setupTestMongo();
    if (!ok) {
      throw new Error('MONGODB_URI_TEST is unset — skipping auth integration');
    }
  });

  afterAll(async () => {
    await teardownTestMongo();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  function uniqueIp(): string {
    return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  async function registerPending(
    email: string,
    extras?: { fullName?: string; phone?: string; password?: string },
  ) {
    const ip = uniqueIp();
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', ip)
      .send({
        fullName: extras?.fullName ?? 'Test User',
        email,
        phone: extras?.phone ?? '03001234567',
        password: extras?.password ?? 'password123',
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    return { ip, password: extras?.password ?? 'password123' };
  }

  async function activate(email: string) {
    await User.updateOne({ email }, { status: 'active' });
  }

  it('register creates pending user without a session', async () => {
    const agent = request.agent(app);
    const ip = uniqueIp();

    const reg = await agent
      .post('/api/auth/register')
      .set('X-Forwarded-For', ip)
      .send({
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '03001234567',
        password: 'password123',
      });
    expect(reg.status).toBe(201);
    expect(reg.body).toEqual({ ok: true });

    const user = await User.findOne({ email: 'test@example.com' });
    expect(user?.status).toBe('pending');

    const me = await agent.get('/api/auth/me').set('X-Forwarded-For', ip);
    expect(me.status).toBe(401);
  });

  it('pending login is rejected until admin approves', async () => {
    await registerPending('pending@example.com');

    const blocked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email: 'pending@example.com', password: 'password123' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ACCOUNT_PENDING');

    await activate('pending@example.com');

    const agent = request.agent(app);
    const ip = uniqueIp();
    const login = await agent
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'pending@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe('pending@example.com');

    const me = await agent.get('/api/auth/me').set('X-Forwarded-For', ip);
    expect(me.status).toBe(200);

    const logout = await agent.post('/api/auth/logout').set('X-Forwarded-For', ip);
    expect(logout.status).toBe(204);

    const meAfter = await agent.get('/api/auth/me').set('X-Forwarded-For', ip);
    expect(meAfter.status).toBe(401);
  });

  it('duplicate email returns 409', async () => {
    const body = {
      fullName: 'Test User',
      email: 'dupe@example.com',
      phone: '03001234567',
      password: 'password123',
    };
    await request(app).post('/api/auth/register').set('X-Forwarded-For', uniqueIp()).send(body);
    const second = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', uniqueIp())
      .send(body);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('honeypot returns 201 without creating a user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', uniqueIp())
      .send({
        fullName: 'Bot',
        email: 'bot@example.com',
        phone: '03001234567',
        password: 'password123',
        website: 'http://spam.test',
      });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(await User.countDocuments({ email: 'bot@example.com' })).toBe(0);
  });

  it('locks after 5 failed logins', async () => {
    await registerPending('lock@example.com', { phone: '03001234568' });
    await activate('lock@example.com');

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', uniqueIp())
        .send({ email: 'lock@example.com', password: 'wrong-password' });
    }

    const locked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email: 'lock@example.com', password: 'wrong-password' });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('disabled user is rejected on next authenticated request', async () => {
    await registerPending('disabled@example.com', { phone: '03001234569' });
    await activate('disabled@example.com');

    const agent = request.agent(app);
    const ip = uniqueIp();
    await agent
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'disabled@example.com', password: 'password123' });

    await User.updateOne({ email: 'disabled@example.com' }, { status: 'disabled' });

    const me = await agent.get('/api/auth/me').set('X-Forwarded-For', ip);
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('change-password revokes other sessions', async () => {
    const email = 'pwd@example.com';
    const password = 'password123';
    await registerPending(email, { phone: '03001234570', password });
    await activate(email);

    const agentA = request.agent(app);
    await agentA
      .post('/api/auth/login')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email, password });

    const agentB = request.agent(app);
    await agentB
      .post('/api/auth/login')
      .set('X-Forwarded-For', uniqueIp())
      .send({ email, password });

    const change = await agentA
      .post('/api/auth/change-password')
      .set('X-Forwarded-For', uniqueIp())
      .send({ currentPassword: password, newPassword: 'password456' });
    expect(change.status).toBe(204);

    const meB = await agentB.get('/api/auth/me').set('X-Forwarded-For', uniqueIp());
    expect(meB.status).toBe(401);

    const meA = await agentA.get('/api/auth/me').set('X-Forwarded-For', uniqueIp());
    expect(meA.status).toBe(200);
  });
});

if (!hasTestDb) {
  describe('auth integration (skipped)', () => {
    it('skips because MONGODB_URI_TEST is unset', () => {
      console.warn('SKIP: set MONGODB_URI_TEST (db name ending in _test) to run integration tests');
      expect(true).toBe(true);
    });
  });
}
