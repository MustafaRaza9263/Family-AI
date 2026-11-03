import { describe, expect, it, vi } from 'vitest';
import {
  buildStudioTestApp,
  loginAgent,
  seedActiveUser,
} from '../helpers/test-studio-app.js';
import type { JobMetricsRow } from '../../src/telemetry/schema.js';

async function seedAdminAndUser() {
  const ctx = await buildStudioTestApp();
  const admin = await seedActiveUser(ctx.users, {
    email: 'admin@example.com',
    fullName: 'Admin',
    password: 'password1234',
    role: 'admin',
  });
  const user = await seedActiveUser(ctx.users, {
    email: 'alice@example.com',
    fullName: 'Alice Smith',
    password: 'password1234',
  });
  const agent = await loginAgent(ctx.app, 'admin@example.com', 'password1234');
  const userAgent = await loginAgent(ctx.app, 'alice@example.com', 'password1234');
  return { ...ctx, admin, user, agent, userAgent };
}

describe('admin jobs / stats / events routes', () => {
  it('returns 403 for non-admins on every new route', async () => {
    const { app, users } = await buildStudioTestApp();
    await seedActiveUser(users, {
      email: 'u@example.com',
      fullName: 'U',
      password: 'password1234',
    });
    const agent = await loginAgent(app, 'u@example.com', 'password1234');
    expect((await agent.get('/api/admin/jobs')).status).toBe(403);
    expect((await agent.get('/api/admin/jobs/abc')).status).toBe(403);
    expect((await agent.get('/api/admin/stats')).status).toBe(403);
    expect((await agent.get('/api/admin/events')).status).toBe(403);
  });

  it('lists jobs with filters, cursor, and escaped prompt search', async () => {
    const { agent, jobs, user, users } = await seedAdminAndUser();
    const other = await seedActiveUser(users, {
      email: 'bob@example.com',
      fullName: 'Bob',
      password: 'password1234',
    });

    const t0 = new Date('2026-11-01T10:00:00.000Z');
    const a = await jobs.create({
      userId: user.id,
      threadId: '111111111111111111111111',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'cat (special)',
      params: {},
      inputAssetIds: [],
      queuedAt: t0,
    });
    await jobs.create({
      userId: other.id,
      threadId: '111111111111111111111112',
      tool: 'video',
      recipeId: 'video-from-text',
      prompt: 'dog',
      params: {},
      inputAssetIds: [],
      queuedAt: new Date('2026-11-01T11:00:00.000Z'),
    });

    const byUser = await agent.get('/api/admin/jobs?user=alice');
    expect(byUser.status).toBe(200);
    expect(byUser.body.items).toHaveLength(1);
    expect(byUser.body.items[0].id).toBe(a.id);

    const byPrompt = await agent.get(
      `/api/admin/jobs?q=${encodeURIComponent('(special)')}`,
    );
    expect(byPrompt.status).toBe(200);
    expect(byPrompt.body.items).toHaveLength(1);

    const byTool = await agent.get('/api/admin/jobs?tool=video');
    expect(byTool.status).toBe(200);
    expect(byTool.body.items).toHaveLength(1);

    const page1 = await agent.get('/api/admin/jobs?limit=1');
    expect(page1.body.items).toHaveLength(1);
    expect(page1.body.nextCursor).toBeTruthy();
    const page2 = await agent.get(
      `/api/admin/jobs?limit=1&cursor=${encodeURIComponent(page1.body.nextCursor)}`,
    );
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.items[0].id).not.toBe(page1.body.items[0].id);
  });

  it('returns detail with metrics, expired flag, and never leaks errorDetail to users', async () => {
    const { agent, jobs, user, metrics } = await seedAdminAndUser();
    const job = await jobs.create({
      userId: user.id,
      threadId: '111111111111111111111111',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'fail me',
      params: {},
      inputAssetIds: [],
      queuedAt: new Date('2026-11-01T10:00:00.000Z'),
    });
    await jobs.finish(job.id, {
      status: 'failed',
      finishedAt: new Date('2026-11-01T10:01:00.000Z'),
      errorCode: 'ENGINE_FAILED',
      errorDetail: 'Comfy blew up at node 57',
    });

    const row: JobMetricsRow = {
      jobId: job.id,
      userId: user.id,
      recipeId: 'image-create-fast',
      tool: 'image',
      status: 'failed',
      errorCode: 'ENGINE_FAILED',
      queuedAt: job.timings.queuedAt,
      startedAt: new Date('2026-11-01T10:00:30.000Z'),
      finishedAt: new Date('2026-11-01T10:01:00.000Z'),
      queueWaitMs: 30_000,
      runMs: 30_000,
      nodes: [],
      phases: { loadMs: 0, sampleMs: 100, decodeMs: 0, otherMs: 0 },
      hardware: {
        samples: 1,
        gpuUtilAvg: 10,
        gpuUtilPeak: 20,
        powerAvgW: 50,
        powerPeakW: 60,
        tempPeakC: 40,
        memUsedAvgMb: 1000,
        memUsedPeakMb: 1200,
        memAvailableMinMb: 5000,
        swapUsedStartMb: 0,
        swapUsedPeakMb: 10,
        memTotalMb: 24000,
        gpuAvailable: true,
      },
      warm: false,
      createdAt: new Date('2026-11-01T10:01:00.000Z'),
    };
    await metrics.save(row);

    const detail = await agent.get(`/api/admin/jobs/${job.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.job.errorDetail).toBe('Comfy blew up at node 57');
    expect(detail.body.job.metricsFull?.runMs).toBe(30_000);

    // User generation DTO must never include errorDetail.
    const { toUserJob } = await import('../../src/mappers/job.js');
    const finished = await jobs.findById(job.id);
    expect(finished).not.toBeNull();
    if (!finished) return;
    const dto = toUserJob(finished);
    expect(dto).not.toHaveProperty('errorDetail');
    expect(JSON.stringify(dto)).not.toContain('Comfy blew up');
  });

  it('marks metricsExpired when finished job is older than retention and has no row', async () => {
    const { agent, jobs, user, clock } = await seedAdminAndUser();
    const old = await jobs.create({
      userId: user.id,
      threadId: '111111111111111111111111',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'ancient',
      params: {},
      inputAssetIds: [],
      queuedAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    await jobs.finish(old.id, {
      status: 'done',
      finishedAt: new Date('2025-01-01T00:01:00.000Z'),
    });
    // Default retention 90 days; clock is 2026-10-30.
    expect(clock.now().toISOString()).toContain('2026');

    const detail = await agent.get(`/api/admin/jobs/${old.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.job.metricsFull).toBeNull();
    expect(detail.body.job.metricsExpired).toBe(true);
  });

  it('returns stats for a range', async () => {
    const { agent, jobs, user } = await seedAdminAndUser();
    await jobs.create({
      userId: user.id,
      threadId: '111111111111111111111111',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: new Date('2026-10-30T11:00:00.000Z'),
    });
    const res = await agent.get('/api/admin/stats?range=24h');
    expect(res.status).toBe(200);
    expect(res.body.range).toBe('24h');
    expect(res.body.counts.total).toBeGreaterThanOrEqual(1);
  });

  it('does not N+1: findByIds called once per collection for a list page', async () => {
    const { agent, jobs, user, users, assets } = await seedAdminAndUser();
    for (let i = 0; i < 3; i++) {
      await jobs.create({
        userId: user.id,
        threadId: '111111111111111111111111',
        tool: 'image',
        recipeId: 'image-create-fast',
        prompt: `p${i}`,
        params: {},
        inputAssetIds: [],
        queuedAt: new Date(`2026-11-01T10:0${i}:00.000Z`),
      });
    }
    const userSpy = vi.spyOn(users, 'findByIds');
    const assetSpy = vi.spyOn(assets, 'findByIds');
    const res = await agent.get('/api/admin/jobs?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(3);
    expect(userSpy).toHaveBeenCalledTimes(1);
    expect(assetSpy).toHaveBeenCalledTimes(1);
  });
});
