import { describe, expect, it } from 'vitest';
import {
  buildStudioTestApp,
  loginAgent,
  seedActiveUser,
} from '../helpers/test-studio-app.js';

describe('thread tool rules', () => {
  it('requires tool on create and filters list by tool', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    const agent = await loginAgent(app, 'a@example.com', 'password1234');

    const bad = await agent.post('/api/threads').send({});
    expect(bad.status).toBe(400);

    const image = await agent.post('/api/threads').send({ tool: 'image' });
    const video = await agent.post('/api/threads').send({ tool: 'video' });
    expect(image.status).toBe(201);
    expect(video.status).toBe(201);
    expect(image.body.thread.tool).toBe('image');
    expect(video.body.thread.tool).toBe('video');

    const onlyVideo = await agent.get('/api/threads?tool=video');
    expect(onlyVideo.status).toBe(200);
    expect(onlyVideo.body.items).toHaveLength(1);
    expect(onlyVideo.body.items[0].tool).toBe('video');
  });

  it('rejects a generation whose tool differs from the thread', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'a@example.com',
      fullName: 'A',
      password: 'password1234',
    });
    const agent = await loginAgent(app, 'a@example.com', 'password1234');
    const thread = await agent.post('/api/threads').send({ tool: 'image' });
    const res = await agent
      .post(`/api/threads/${thread.body.thread.id}/generations`)
      .send({
        tool: 'video',
        prompt: 'nope',
        values: {},
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});
