import { describe, expect, it, vi } from 'vitest';
import { createTelemetry } from '../../src/telemetry/index.js';
import { MemoryMetricsStore } from '../../src/telemetry/store/memory-store.js';
import type { JobMetricsRow } from '../../src/telemetry/schema.js';
import type { MetricsStore } from '../../src/telemetry/store/types.js';
import { FakeSampler, mutableClock, silentLogger } from './helpers.js';

describe('createTelemetry', () => {
  it('records two samples for a sub-second run', async () => {
    const clock = mutableClock();
    const sampler = new FakeSampler();
    const store = new MemoryMetricsStore();
    const telemetry = createTelemetry({
      store,
      sampler,
      logger: silentLogger(),
      clock,
      config: {
        enabled: true,
        sampleIntervalMs: 1000,
        retentionDays: 90,
      },
    });

    telemetry.runStart('job-1', {
      userId: 'u1',
      recipeId: 'image-create-fast',
      tool: 'image',
      queuedAt: clock.now(),
    });
    clock.advance(200);
    telemetry.runEnd('job-1', { status: 'done' });
    await telemetry.flush();

    const row = await store.findByJobId('job-1');
    expect(row?.hardware.samples).toBe(2);
    expect(sampler.acquires).toBe(1);
    expect(sampler.releases).toBe(1);
  });

  it('ignores a second runEnd and runEnd without runStart without throwing', async () => {
    const clock = mutableClock();
    const store = new MemoryMetricsStore();
    const telemetry = createTelemetry({
      store,
      sampler: new FakeSampler(),
      logger: silentLogger(),
      clock,
    });

    expect(() => telemetry.runEnd('missing', { status: 'failed' })).not.toThrow();

    telemetry.runStart('job-2', {
      userId: 'u1',
      recipeId: 'r',
      tool: 'image',
      queuedAt: clock.now(),
    });
    telemetry.runEnd('job-2', { status: 'done' });
    expect(() => telemetry.runEnd('job-2', { status: 'failed' })).not.toThrow();
    await telemetry.flush();

    const row = await store.findByJobId('job-2');
    expect(row?.status).toBe('done');
  });

  it('does not throw when store.save rejects or sampler.read throws', async () => {
    const clock = mutableClock();
    const sampler = new FakeSampler();
    const store: MetricsStore = {
      save: vi.fn(async () => {
        throw new Error('db down');
      }),
      findByJobId: async () => null,
      list: async () => [],
    };
    const telemetry = createTelemetry({
      store,
      sampler,
      logger: silentLogger(),
      clock,
    });

    expect(() =>
      telemetry.runStart('job-3', {
        userId: 'u1',
        recipeId: 'r',
        tool: 'video',
        queuedAt: clock.now(),
      }),
    ).not.toThrow();

    sampler.throwOnRead = true;
    expect(() => telemetry.runEnd('job-3', { status: 'done' })).not.toThrow();
    await telemetry.flush();
    expect(store.save).toHaveBeenCalled();
  });

  it('returns no-ops when disabled', async () => {
    const store = new MemoryMetricsStore();
    const sampler = new FakeSampler();
    const telemetry = createTelemetry({
      store,
      sampler,
      logger: silentLogger(),
      config: {
        enabled: false,
        sampleIntervalMs: 1000,
        retentionDays: 90,
      },
    });
    telemetry.runStart('x', {
      userId: 'u',
      recipeId: 'r',
      tool: 'image',
      queuedAt: new Date(),
    });
    telemetry.runEnd('x', { status: 'done' });
    await telemetry.flush();
    expect(sampler.acquires).toBe(0);
    expect(await store.findByJobId('x')).toBeNull();
  });

  it('builds node and phase fields on a normal run', async () => {
    const clock = mutableClock();
    const store = new MemoryMetricsStore();
    const telemetry = createTelemetry({
      store,
      sampler: new FakeSampler(),
      logger: silentLogger(),
      clock,
    });

    const queuedAt = clock.now();
    telemetry.runStart('job-4', {
      userId: 'u1',
      recipeId: 'image-create-fast',
      tool: 'image',
      queuedAt,
    });
    clock.advance(100);
    telemetry.runEvent('job-4', {
      type: 'nodes_cached',
      nodes: [{ nodeId: 'c1', nodeClass: 'CLIPLoader', nodeTitle: 'Load CLIP' }],
      at: clock.now(),
    });
    clock.advance(100);
    telemetry.runEvent('job-4', {
      type: 'node_start',
      nodeId: 'n1',
      nodeClass: 'KSampler',
      at: clock.now(),
    });
    clock.advance(500);
    telemetry.runEnd('job-4', {
      status: 'done',
      output: { width: 512, height: 512 },
    });
    await telemetry.flush();

    const row = (await store.findByJobId('job-4')) as JobMetricsRow;
    expect(row.nodes).toEqual([
      {
        nodeId: 'c1',
        class: 'CLIPLoader',
        title: 'Load CLIP',
        ms: 0,
        cached: true,
      },
      { nodeId: 'n1', class: 'KSampler', ms: 500, cached: false },
    ]);
    expect(row.phases.sampleMs).toBe(500);
    expect(row.runMs).toBe(700);
    expect(row.warm).toBe(true);
  });

  it('sets warm false when a Loader node actually ran', async () => {
    const clock = mutableClock();
    const store = new MemoryMetricsStore();
    const telemetry = createTelemetry({
      store,
      sampler: new FakeSampler(),
      logger: silentLogger(),
      clock,
    });

    telemetry.runStart('job-warm', {
      userId: 'u1',
      recipeId: 'r',
      tool: 'image',
      queuedAt: clock.now(),
    });
    clock.advance(50);
    telemetry.runEvent('job-warm', {
      type: 'node_start',
      nodeId: '1',
      nodeClass: 'UNETLoader',
      at: clock.now(),
    });
    clock.advance(200);
    telemetry.runEnd('job-warm', { status: 'done' });
    await telemetry.flush();

    const row = await store.findByJobId('job-warm');
    expect(row?.warm).toBe(false);
  });
});
