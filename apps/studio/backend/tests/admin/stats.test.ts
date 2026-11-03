import { describe, expect, it } from 'vitest';
import { computeAdminStats, percentile } from '../../src/admin/stats.js';
import type { JobRecord } from '../../src/db/repositories/job-repository.js';
import type { UserRecord } from '../../src/db/repositories/user-repository.js';
import type { JobMetricsRow } from '../../src/telemetry/schema.js';

function job(
  overrides: Partial<JobRecord> & Pick<JobRecord, 'id' | 'status' | 'recipeId'>,
): JobRecord {
  return {
    userId: 'u1',
    threadId: 't1',
    tool: 'image',
    prompt: 'p',
    params: {},
    inputAssetIds: [],
    outputAssetIds: [],
    attempts: 1,
    timings: { queuedAt: new Date('2026-11-01T00:00:00.000Z') },
    ...overrides,
  };
}

function metrics(
  overrides: Partial<JobMetricsRow> & Pick<JobMetricsRow, 'jobId' | 'runMs'>,
): JobMetricsRow {
  return {
    userId: 'u1',
    recipeId: 'image-create-fast',
    tool: 'image',
    status: 'done',
    queuedAt: new Date('2026-11-01T00:00:00.000Z'),
    startedAt: new Date('2026-11-01T00:00:10.000Z'),
    finishedAt: new Date('2026-11-01T00:00:20.000Z'),
    queueWaitMs: 10_000,
    nodes: [],
    phases: { loadMs: 0, sampleMs: 0, decodeMs: 0, otherMs: 0 },
    hardware: {
      samples: 1,
      gpuUtilAvg: 50,
      gpuUtilPeak: 80,
      powerAvgW: 100,
      powerPeakW: 120,
      tempPeakC: 60,
      memUsedAvgMb: 8000,
      memUsedPeakMb: 9000,
      memAvailableMinMb: 10000,
      swapUsedStartMb: 100,
      swapUsedPeakMb: 200,
      memTotalMb: 24000,
      gpuAvailable: true,
    },
    warm: true,
    createdAt: new Date('2026-11-01T00:00:20.000Z'),
    ...overrides,
  };
}

const user: UserRecord = {
  id: 'u1',
  email: 'a@example.com',
  fullName: 'Ada',
  passwordHash: 'x',
  role: 'user',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('percentile', () => {
  it('uses nearest-rank', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5], 95)).toBe(5);
    expect(percentile([], 50)).toBeNull();
  });
});

describe('computeAdminStats', () => {
  it('aggregates counts, success rate, and per-recipe stats', () => {
    const jobs = [
      job({ id: 'j1', status: 'done', recipeId: 'image-create-fast' }),
      job({ id: 'j2', status: 'failed', recipeId: 'image-create-fast', errorCode: 'ENGINE_FAILED' }),
      job({ id: 'j3', status: 'done', recipeId: 'video-from-text', tool: 'video', userId: 'u1' }),
    ];
    const rows = [
      metrics({ jobId: 'j1', runMs: 1000, queueWaitMs: 100, warm: true }),
      metrics({
        jobId: 'j2',
        runMs: 2000,
        queueWaitMs: 200,
        warm: false,
        status: 'failed',
        errorCode: 'ENGINE_FAILED',
      }),
      metrics({
        jobId: 'j3',
        runMs: 5000,
        queueWaitMs: 300,
        recipeId: 'video-from-text',
        tool: 'video',
        warm: true,
      }),
    ];

    const stats = computeAdminStats({
      range: '24h',
      from: new Date('2026-11-01T00:00:00.000Z'),
      to: new Date('2026-11-02T00:00:00.000Z'),
      jobs,
      metrics: rows,
      users: [user],
      truncated: true,
    });

    expect(stats.truncated).toBe(true);
    expect(stats.counts.total).toBe(3);
    expect(stats.counts.done).toBe(2);
    expect(stats.counts.failed).toBe(1);
    expect(stats.successRate).toBeCloseTo(2 / 3);
    expect(stats.queueWaitP50).toBe(200);
    expect(stats.topErrors[0]).toEqual({ code: 'ENGINE_FAILED', count: 1 });
    expect(stats.topUsers[0]?.runs).toBe(3);
    expect(stats.recipes).toHaveLength(2);
    const fast = stats.recipes.find((r) => r.recipeId === 'image-create-fast');
    expect(fast?.runs).toBe(2);
    expect(fast?.warmRate).toBe(0.5);
  });
});
