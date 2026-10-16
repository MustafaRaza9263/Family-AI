import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { hashPassword } from '../../src/lib/password';
import { AuditLog } from '../../src/models/audit-log.model';
import { User } from '../../src/models/user.model';
import { createFakeKnowledge, createPlainLlm } from '../helpers/fakes';
import {
  assertTestDatabase,
  clearCollections,
  setupTestMongo,
  teardownTestMongo,
} from '../helpers/mongo';

const hasTestDb = Boolean(assertTestDatabase());

describe.skipIf(!hasTestDb)('admin + assets integration', () => {
  const app = createApp({
    llm: createPlainLlm(),
    knowledge: createFakeKnowledge(),
  });

  beforeAll(async () => {
    await setupTestMongo();
  });
  afterAll(async () => {
    await teardownTestMongo();
  });
  beforeEach(async () => {
    await clearCollections();
  });

  async function makeUser(email: string, role: 'user' | 'admin' = 'user') {
    await User.create({
      email,
      fullName: email,
      phone: '+923001111111',
      passwordHash: await hashPassword('password123'),
      role,
      status: 'active',
    });
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .set('X-Forwarded-For', `13.${Math.random()}`)
      .send({ email, password: 'password123' });
    return agent;
  }

  it('admin routes 403 for users and OK for admins', async () => {
    const user = await makeUser('user@example.com', 'user');
    const admin = await makeUser('admin@example.com', 'admin');

    const denied = await user.get('/api/admin/users');
    expect(denied.status).toBe(403);

    const ok = await admin.get('/api/admin/users');
    expect(ok.status).toBe(200);
    expect(ok.body.items.length).toBeGreaterThanOrEqual(2);
  });

  it('writes audit rows when viewing chats', async () => {
    const admin = await makeUser('admin2@example.com', 'admin');
    const target = await User.create({
      email: 'target@example.com',
      fullName: 'Target',
      phone: '+923002222222',
      passwordHash: await hashPassword('password123'),
      role: 'user',
      status: 'active',
    });

    await admin.get(`/api/admin/users/${target._id.toString()}/conversations`);
    const rows = await AuditLog.find({ action: 'admin.view_user_chats' });
    expect(rows.length).toBe(1);
  });

  it('assets only serve files in the parsed image map', async () => {
    const user = await makeUser('assets@example.com', 'user');

    const ok = await user.get(
      '/api/assets/seven-towers/images/sample-floor-plan',
    );
    expect(ok.status).toBe(200);
    expect(ok.headers['content-type']).toMatch(/image\/webp/);

    const missing = await user.get(
      '/api/assets/seven-towers/images/not-in-knowledge',
    );
    expect(missing.status).toBe(404);
  });
});
