import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTelemetry } from '../../src/telemetry/index.js';
import { MemoryMetricsStore } from '../../src/telemetry/store/memory-store.js';
import { FakeSampler, mutableClock, silentLogger } from './helpers.js';

describe('telemetry snapshot and watch', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a mid-run snapshot with the open node marked running', () => {
    const clock = mutableClock();
    const telemetry = createTelemetry({
      store: new MemoryMetricsStore(),
      sampler: new FakeSampler(),
      logger: silentLogger(),
      clock,
      config: { enabled: true, sampleIntervalMs: 1000, retentionDays: 90 },
    });

    telemetry.runStart('job-1', {
      userId: 'u1',
      recipeId: 'image-create-fast',
      tool: 'image',
      queuedAt: clock.now(),
    });
    clock.advance(100);
    telemetry.runEvent('job-1', {
      type: 'node_start',
      nodeId: 'n1',
      nodeClass: 'KSampler',
      at: clock.now(),
    });
    clock.advance(250);

    const snap = telemetry.snapshot('job-1');
    expect(snap).not.toBeNull();
    if (!snap) return;
    expect(snap.elapsedMs).toBe(350);
    expect(snap.nodes).toEqual([
      expect.objectContaining({
        nodeId: 'n1',
        class: 'KSampler',
        ms: 250,
        running: true,
      }),
    ]);
    expect(telemetry.snapshot('missing')).toBeNull();
  });

  it('watch acquires/releases the sampler and is a no-op when disabled', () => {
    vi.useFakeTimers();
    const sampler = new FakeSampler();
    const enabled = createTelemetry({
      store: new MemoryMetricsStore(),
      sampler,
      logger: silentLogger(),
      config: { enabled: true, sampleIntervalMs: 1000, retentionDays: 90 },
    });

    const samples: number[] = [];
    const stop = enabled.watch((s) => {
      samples.push(s.gpuUtilPct ?? -1);
    }, 1000);
    expect(sampler.acquires).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(samples.length).toBeGreaterThanOrEqual(2);
    stop();
    expect(sampler.releases).toBe(1);

    const disabled = createTelemetry({
      store: new MemoryMetricsStore(),
      sampler: new FakeSampler(),
      logger: silentLogger(),
      config: { enabled: false, sampleIntervalMs: 1000, retentionDays: 90 },
    });
    const stopDisabled = disabled.watch(() => undefined);
    stopDisabled();
    expect(disabled.snapshot('x')).toBeNull();
  });
});
