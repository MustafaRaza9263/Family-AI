import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  buildStudioTestApp,
  loginAgent,
  seedActiveUser,
} from '../helpers/test-studio-app.js';

describe('studio HTTP API', () => {
  it('requires auth on capabilities', async () => {
    const { app } = await buildStudioTestApp();
    const res = await request(app).get('/api/capabilities');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('blocks pending users from capabilities after they somehow have a session', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'pending@example.com',
      fullName: 'Pending',
      password: 'password1234',
      status: 'pending',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'pending@example.com',
      password: 'password1234',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_PENDING');
  });

  it('returns capabilities without recipe leakage', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    const agent = await loginAgent(app, 'a@example.com', 'password1234');
    const res = await agent.get('/api/capabilities');
    expect(res.status).toBe(200);
    expect(res.body.product).toBe('Minimal Studio');
    expect(JSON.stringify(res.body)).not.toContain('image-create-fast');
    expect(JSON.stringify(res.body)).not.toMatch(/IN_/);
  });

  it('enforces thread ownership across users', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    await seedActiveUser(users, {
      email: 'b@example.com',
      fullName: 'B',
      password: 'password1234',
    });
    const agentA = await loginAgent(app, 'a@example.com', 'password1234');
    const created = await agentA.post('/api/threads').send({});
    expect(created.status).toBe(201);
    const threadId = created.body.thread.id as string;

    const agentB = await loginAgent(app, 'b@example.com', 'password1234');
    const peek = await agentB.get(`/api/threads/${threadId}`);
    expect(peek.status).toBe(404);
  });

  it('creates a generation (202) and sets thread title from prompt', async () => {
    const { app, users, jobs } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    const agent = await loginAgent(app, 'a@example.com', 'password1234');
    const thread = await agent.post('/api/threads').send({});
    const threadId = thread.body.thread.id as string;

    const res = await agent.post(`/api/threads/${threadId}/generations`).send({
      tool: 'image',
      prompt: 'A red cube on a table',
      values: { aspectRatio: '1:1' },
      variant: 'fast',
    });
    expect(res.status).toBe(202);
    expect(res.body.job.status).toBe('queued');
    expect(res.body.job).not.toHaveProperty('recipeId');

    const detail = await agent.get(`/api/threads/${threadId}`);
    expect(detail.body.thread.title).toBe('A red cube on a table');
    expect(jobs.jobs.size).toBe(1);
  });

  it('cancels a queued generation', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    const agent = await loginAgent(app, 'a@example.com', 'password1234');
    const thread = await agent.post('/api/threads').send({});
    const gen = await agent
      .post(`/api/threads/${thread.body.thread.id}/generations`)
      .send({
        tool: 'image',
        prompt: 'cancel me',
        values: { aspectRatio: '1:1' },
      });
    const jobId = gen.body.job.id as string;
    const cancel = await agent.delete(`/api/generations/${jobId}`);
    expect(cancel.status).toBe(204);
  });

  it('SSE connects and receives job.queued', async () => {
    const { createServer } = await import('node:http');
    const { app, users, hub } = await buildStudioTestApp();
    const user = await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('no address');
    const base = `http://127.0.0.1:${addr.port}`;

    try {
      const login = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'a@example.com',
          password: 'password1234',
        }),
      });
      expect(login.status).toBe(200);
      const setCookie = login.headers.getSetCookie?.() ?? [];
      const sid = setCookie
        .map((c) => c.split(';')[0])
        .find((c) => c?.startsWith('studio_sid='));
      if (!sid) throw new Error('missing studio_sid cookie');

      const ac = new AbortController();
      const res = await fetch(`${base}/api/events`, {
        headers: { Cookie: sid },
        signal: ac.signal,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
      expect(res.headers.get('x-accel-buffering')).toBe('no');

      if (!res.body) throw new Error('missing SSE body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      const readDone = (async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          if (buf.includes('job.queued')) {
            ac.abort();
            return buf;
          }
        }
        throw new Error('stream ended');
      })();

      for (let i = 0; i < 50 && hub.connectionCount(user.id) === 0; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      expect(hub.connectionCount(user.id)).toBeGreaterThan(0);

      hub.publish(user.id, {
        type: 'job.queued',
        jobId: 'job-sse',
        threadId: 'thread-sse',
        position: 1,
      });

      const payload = await Promise.race([
        readDone,
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('SSE timeout')), 3000),
        ),
      ]);
      expect(payload).toContain('job.queued');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });

  it('blocks non-owner file access; admin can read with audit', async () => {
    const ctx = await buildStudioTestApp();
    const userA = await seedActiveUser(ctx.users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    await seedActiveUser(ctx.users, {
      email: 'b@example.com',
      fullName: 'B',
      password: 'password1234',
    });
    await seedActiveUser(ctx.users, {
      email: 'admin@example.com',
      fullName: 'Admin',
      password: 'password1234',
      role: 'admin',
    });

    const asset = await ctx.assets.create({
      userId: userA.id,
      kind: 'image',
      filePath: '',
      thumbPath: '',
      mime: 'image/png',
      bytes: 4,
      width: 1,
      height: 1,
      source: 'generated',
      createdAt: ctx.clock.now(),
    });
    const userDir = path.resolve(ctx.env.DATA_DIR, userA.id);
    await mkdir(userDir, { recursive: true });
    const filePath = path.join(userDir, `${asset.id}.png`);
    const thumbPath = path.join(userDir, `${asset.id}.thumb.webp`);
    await writeFile(filePath, Buffer.from([1, 2, 3, 4]));
    await writeFile(thumbPath, Buffer.from([1, 2, 3, 4]));
    await ctx.assets.updatePaths(asset.id, filePath, thumbPath);

    const agentB = await loginAgent(ctx.app, 'b@example.com', 'password1234');
    const denied = await agentB.get(`/api/files/${asset.id}`);
    expect(denied.status).toBe(403);

    const admin = await loginAgent(ctx.app, 'admin@example.com', 'password1234');
    const ok = await admin.get(`/api/files/${asset.id}`);
    expect(ok.status).toBe(200);
    expect(ctx.audit.logs.some((l) => l.action === 'asset.view')).toBe(true);
  });

  it('admin-only engine route', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    await seedActiveUser(users, {
      email: 'admin@example.com',
      fullName: 'Admin',
      password: 'password1234',
      role: 'admin',
    });
    const user = await loginAgent(app, 'a@example.com', 'password1234');
    expect((await user.get('/api/admin/engine')).status).toBe(403);

    const admin = await loginAgent(app, 'admin@example.com', 'password1234');
    const get = await admin.get('/api/admin/engine');
    expect(get.status).toBe(200);
    expect(get.body.paused).toBe(false);
    const patch = await admin.patch('/api/admin/engine').send({ paused: true });
    expect(patch.status).toBe(200);
    expect(patch.body.paused).toBe(true);
  });

  it('returns QUOTA_ACTIVE when per-user active cap is full', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    const agent = await loginAgent(app, 'a@example.com', 'password1234');
    const thread = await agent.post('/api/threads').send({});
    const threadId = thread.body.thread.id as string;

    // Default: 1 running + 3 queued = 4 active.
    for (let i = 0; i < 4; i++) {
      const res = await agent.post(`/api/threads/${threadId}/generations`).send({
        tool: 'image',
        prompt: `run ${i}`,
        values: { aspectRatio: '1:1' },
      });
      expect(res.status).toBe(202);
    }
    const blocked = await agent.post(`/api/threads/${threadId}/generations`).send({
      tool: 'image',
      prompt: 'too many',
      values: { aspectRatio: '1:1' },
    });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('QUOTA_ACTIVE');
  });
});

