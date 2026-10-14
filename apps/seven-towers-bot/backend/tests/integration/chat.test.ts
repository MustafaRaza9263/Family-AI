import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  createFakeKnowledge,
  createPlainLlm,
  createToolLlm,
} from '../helpers/fakes';
import {
  assertTestDatabase,
  clearCollections,
  setupTestMongo,
  teardownTestMongo,
} from '../helpers/mongo';

const hasTestDb = Boolean(assertTestDatabase());

function parseSse(body: string): { event: string; data: unknown }[] {
  const events: { event: string; data: unknown }[] = [];
  const blocks = body.split('\n\n').filter(Boolean);
  for (const block of blocks) {
    if (block.startsWith(':')) {
      continue;
    }
    const lines = block.split('\n');
    let event = 'message';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data = line.slice(5).trim();
      }
    }
    if (data) {
      events.push({ event, data: JSON.parse(data) });
    }
  }
  return events;
}

describe.skipIf(!hasTestDb)('chat integration', () => {
  beforeAll(async () => {
    await setupTestMongo();
  });
  afterAll(async () => {
    await teardownTestMongo();
  });
  beforeEach(async () => {
    await clearCollections();
  });

  async function register(app: ReturnType<typeof createApp>, email: string) {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').set('X-Forwarded-For', `11.${Math.random()}`).send({
      fullName: 'Chat User',
      email,
      phone: '03001112233',
      password: 'password123',
    });
    return agent;
  }

  it('streams meta, token, done', async () => {
    const app = createApp({
      llm: createPlainLlm('Hello buyer'),
      knowledge: createFakeKnowledge(),
    });
    const agent = await register(app, 'chat1@example.com');

    const res = await agent
      .post('/api/chat')
      .set('X-Forwarded-For', `11.${Math.random()}`)
      .send({ message: 'What is Seven Towers?' });

    expect(res.status).toBe(200);
    const events = parseSse(res.text);
    expect(events.map((e) => e.event)).toEqual(
      expect.arrayContaining(['meta', 'token', 'done']),
    );
    expect(events[0]?.event).toBe('meta');
    expect(events.at(-1)?.event).toBe('done');
  });

  it('emits attachment on tool call', async () => {
    const app = createApp({
      llm: createToolLlm(),
      knowledge: createFakeKnowledge(),
    });
    const agent = await register(app, 'chat2@example.com');

    const res = await agent
      .post('/api/chat')
      .set('X-Forwarded-For', `11.${Math.random()}`)
      .send({ message: 'Show me the floor plan' });

    const events = parseSse(res.text);
    expect(events.some((e) => e.event === 'attachment')).toBe(true);
  });

  it('returns 413 for long messages and 401 without auth', async () => {
    const app = createApp({
      llm: createPlainLlm(),
      knowledge: createFakeKnowledge(),
    });

    const unauth = await request(app)
      .post('/api/chat')
      .send({ message: 'hi' });
    expect(unauth.status).toBe(401);

    const agent = await register(app, 'chat3@example.com');
    const tooLong = await agent
      .post('/api/chat')
      .set('X-Forwarded-For', `11.${Math.random()}`)
      .send({ message: 'x'.repeat(2000) });
    expect(tooLong.status).toBe(413);
    expect(tooLong.body.error.code).toBe('MESSAGE_TOO_LONG');
  });

  it('isolates conversations between users', async () => {
    const app = createApp({
      llm: createPlainLlm('ok'),
      knowledge: createFakeKnowledge(),
    });
    const a = await register(app, 'iso-a@example.com');
    const b = await register(app, 'iso-b@example.com');

    const chatA = await a
      .post('/api/chat')
      .set('X-Forwarded-For', `12.${Math.random()}`)
      .send({ message: 'secret for A' });
    const events = parseSse(chatA.text);
    const meta = events.find((e) => e.event === 'meta')?.data as {
      conversationId: string;
    };

    const stolen = await b.get(`/api/conversations/${meta.conversationId}`);
    expect(stolen.status).toBe(404);
  });
});
