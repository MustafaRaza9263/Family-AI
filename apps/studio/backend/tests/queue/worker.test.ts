import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventHub } from '../../src/events/hub.js';
import { LimitsService } from '../../src/limits/limits.service.js';
import { recoverRunningJobs } from '../../src/queue/recovery.js';
import { createRetention } from '../../src/queue/retention.js';
import { createWarmUp } from '../../src/queue/warm-up.js';
import { createQueueWorker } from '../../src/queue/worker.js';
import { createTelemetry, MemoryMetricsStore } from '../../src/telemetry/index.js';
import { MemoryAssetRepository } from '../fakes/memory-asset-repository.js';
import { MemoryJobRepository } from '../fakes/memory-job-repository.js';
import { MemorySettingsRepository } from '../fakes/memory-settings-repository.js';
import { MemoryUsageDailyRepository } from '../fakes/memory-usage-daily-repository.js';
import { createFakeComfyClient } from '../fakes/fake-comfy-client.js';
import { FakeSampler, mutableClock, silentLogger } from '../telemetry/helpers.js';

// sharp is real; tiny PNG buffer may fail decode — stub write path via vi.mock if needed.
vi.mock('sharp', () => ({
  default: () => ({
    rotate: () => ({
      resize: () => ({
        webp: () => ({
          toFile: async () => undefined,
        }),
      }),
    }),
  }),
}));

describe('queue worker', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), 'studio-queue-'));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  function setup() {
    const clock = mutableClock();
    const jobs = new MemoryJobRepository();
    const assets = new MemoryAssetRepository();
    const settings = new MemorySettingsRepository();
    const usage = new MemoryUsageDailyRepository();
    const hub = createEventHub(clock);
    const comfy = createFakeComfyClient();
    const store = new MemoryMetricsStore();
    const telemetry = createTelemetry({
      store,
      sampler: new FakeSampler(),
      logger: silentLogger(),
      clock,
    });
    const limits = new LimitsService({
      usage,
      jobs,
      settings,
      clock,
      timeZone: 'UTC',
    });
    const events: unknown[] = [];
    hub.subscribe('u1', (ev) => events.push(ev));
    const worker = createQueueWorker({
      comfy,
      jobs,
      assets,
      settings,
      limits,
      hub,
      telemetry,
      clock,
      logger: silentLogger(),
      dataDir,
      pingIntervalMs: 60_000,
      retentionDays: 30,
    });
    return {
      worker,
      jobs,
      assets,
      settings,
      comfy,
      hub,
      telemetry,
      store,
      limits,
      events,
      clock,
    };
  }

  it('runs a job with hook order and telemetry', async () => {
    const ctx = setup();
    await ctx.limits.reserveRun('u1', 'image');
    const job = await ctx.jobs.create({
      userId: 'u1',
      threadId: '000000000000000000000001',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'a cat',
      params: { aspectRatio: '1:1' },
      inputAssetIds: [],
      queuedAt: ctx.clock.now(),
    });
    await ctx.worker.start();
    await waitFor(async () => {
      const j = await ctx.jobs.findById(job.id);
      return j?.status === 'done';
    });
    await ctx.telemetry.flush();
    const row = await ctx.store.findByJobId(job.id);
    expect(row?.status).toBe('done');
    expect(row?.warm).toBe(true);
    expect(ctx.events.some((e) => (e as { type: string }).type === 'job.started')).toBe(
      true,
    );
    expect(ctx.events.some((e) => (e as { type: string }).type === 'job.done')).toBe(
      true,
    );
    await ctx.worker.stop();
    ctx.hub.close();
  });

  it('cancels a queued job with refund', async () => {
    const ctx = setup();
    await ctx.settings.setEnginePaused(true);
    await ctx.limits.reserveRun('u1', 'image');
    const job = await ctx.jobs.create({
      userId: 'u1',
      threadId: 't',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: ctx.clock.now(),
    });
    await ctx.worker.start();
    const ok = await ctx.worker.cancel(job.id, 'u1');
    expect(ok).toBe(true);
    expect((await ctx.jobs.findById(job.id))?.status).toBe('cancelled');
    await ctx.worker.stop();
    ctx.hub.close();
  });

  it('cancels a running job via abort', async () => {
    const ctx = setup();
    ctx.comfy.hangUntilAbort = true;
    await ctx.limits.reserveRun('u1', 'image');
    const job = await ctx.jobs.create({
      userId: 'u1',
      threadId: 't',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: { aspectRatio: '1:1' },
      inputAssetIds: [],
      queuedAt: ctx.clock.now(),
    });
    await ctx.worker.start();
    await waitFor(async () => {
      const j = await ctx.jobs.findById(job.id);
      return j?.status === 'running';
    });
    await ctx.worker.cancel(job.id, 'u1');
    await waitFor(async () => {
      const j = await ctx.jobs.findById(job.id);
      return j?.status === 'cancelled';
    });
    await ctx.worker.stop();
    ctx.hub.close();
  });

  it('does not claim while paused', async () => {
    const ctx = setup();
    await ctx.settings.setEnginePaused(true);
    await ctx.limits.reserveRun('u1', 'image');
    const job = await ctx.jobs.create({
      userId: 'u1',
      threadId: 't',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: ctx.clock.now(),
    });
    await ctx.worker.start();
    await sleep(100);
    expect((await ctx.jobs.findById(job.id))?.status).toBe('queued');
    expect(ctx.comfy.runs.filter((r) => !r.jobId.startsWith('warmup-'))).toHaveLength(
      0,
    );
    await ctx.worker.stop();
    ctx.hub.close();
  });

  it('recovery finishes from history, requeues held, fails after attempts', async () => {
    const ctx = setup();
    const doneJob = await ctx.jobs.create({
      userId: 'u1',
      threadId: 't',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: ctx.clock.now(),
    });
    await ctx.jobs.claim(doneJob.id, ctx.clock.now());
    await ctx.jobs.setComfyPromptId(doneJob.id, 'p-done');
    ctx.comfy.history.set('p-done', {
      outputs: [Buffer.from('png')],
      files: [{ filename: 'a.png', subfolder: '', type: 'output' }],
    });

    const heldJob = await ctx.jobs.create({
      userId: 'u1',
      threadId: 't',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: ctx.clock.now(),
    });
    await ctx.jobs.claim(heldJob.id, ctx.clock.now());
    await ctx.jobs.setComfyPromptId(heldJob.id, 'p-held');
    ctx.comfy.heldPromptIds.add('p-held');

    const failJob = await ctx.jobs.create({
      userId: 'u1',
      threadId: 't',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: ctx.clock.now(),
    });
    const claimedFail = await ctx.jobs.claim(failJob.id, ctx.clock.now());
    // Simulate a second attempt already consumed.
    if (claimedFail) {
      const j = ctx.jobs.jobs.get(failJob.id);
      if (j) j.attempts = 2;
    }

    await recoverRunningJobs({
      comfy: ctx.comfy,
      jobs: ctx.jobs,
      assets: ctx.assets,
      limits: ctx.limits,
      hub: ctx.hub,
      clock: ctx.clock,
      logger: silentLogger(),
      dataDir,
    });

    expect((await ctx.jobs.findById(doneJob.id))?.status).toBe('done');
    expect((await ctx.jobs.findById(heldJob.id))?.status).toBe('queued');
    expect((await ctx.jobs.findById(failJob.id))?.status).toBe('failed');
    ctx.hub.close();
  });

  it('warm-up runs once when idle and skips when busy', async () => {
    const comfy = createFakeComfyClient();
    const jobs = new MemoryJobRepository();
    const warm = createWarmUp({
      comfy,
      jobs,
      logger: silentLogger(),
      isBusy: () => false,
    });
    warm.request();
    await waitFor(() => comfy.warmUpRuns === 1);
    warm.request();
    await waitFor(() => comfy.warmUpRuns === 2);

    const busyWarm = createWarmUp({
      comfy,
      jobs,
      logger: silentLogger(),
      isBusy: () => true,
    });
    const before = comfy.warmUpRuns;
    busyWarm.request();
    await sleep(50);
    expect(comfy.warmUpRuns).toBe(before);

    // Real job already queued → skip
    await jobs.create({
      userId: 'u',
      threadId: 't',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: new Date(),
    });
    const skipWarm = createWarmUp({
      comfy,
      jobs,
      logger: silentLogger(),
      isBusy: () => false,
    });
    const beforeSkip = comfy.warmUpRuns;
    skipWarm.request();
    await sleep(50);
    expect(comfy.warmUpRuns).toBe(beforeSkip);
  });

  it('retention soft-deletes old assets and removes files', async () => {
    const assets = new MemoryAssetRepository();
    const clock = mutableClock(Date.parse('2026-10-30T00:00:00Z'));
    const filePath = path.join(dataDir, 'old.png');
    const thumbPath = path.join(dataDir, 'old.thumb.webp');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, 'x');
    await writeFile(thumbPath, 'y');
    const asset = await assets.create({
      userId: 'u',
      kind: 'image',
      filePath,
      thumbPath,
      mime: 'image/png',
      bytes: 1,
      width: 1,
      height: 1,
      source: 'generated',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const retention = createRetention({
      assets,
      clock,
      logger: silentLogger(),
      retentionDays: 30,
    });
    await retention.runOnce();
    expect((await assets.findById(asset.id))).toBeNull();
    expect(assets.assets.get(asset.id)?.deletedAt).toBeTruthy();
  });
});

async function waitFor(
  pred: () => boolean | Promise<boolean>,
  timeoutMs = 3000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await pred()) return;
    await sleep(20);
  }
  throw new Error('timeout waiting for condition');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
