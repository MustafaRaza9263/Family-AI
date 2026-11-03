import { describe, expect, it } from 'vitest';
import { getWarmCold } from './job-warm';
import type { AdminJobMetrics } from '@studio/shared';

function makeMetrics(warm: boolean): AdminJobMetrics {
  return {
    jobId: 'j1',
    userId: 'u1',
    recipeId: 'image-create-fast',
    tool: 'image',
    status: 'done',
    queuedAt: '2026-11-03T06:00:00.000Z',
    startedAt: '2026-11-03T06:00:05.000Z',
    finishedAt: '2026-11-03T06:00:15.000Z',
    queueWaitMs: 5000,
    runMs: 10_000,
    nodes: [],
    phases: { loadMs: 1000, sampleMs: 8000, decodeMs: 1000, otherMs: 0 },
    hardware: {
      samples: 10,
      gpuUtilAvg: 70,
      gpuUtilPeak: 95,
      powerAvgW: 130,
      powerPeakW: 160,
      tempPeakC: 60,
      memUsedAvgMb: 40_000,
      memUsedPeakMb: 50_000,
      memAvailableMinMb: 20_000,
      swapUsedStartMb: 0,
      swapUsedPeakMb: 0,
      memTotalMb: 131_072,
      gpuAvailable: true,
    },
    warm,
    createdAt: '2026-11-03T06:00:16.000Z',
  };
}

describe('getWarmCold', () => {
  it('returns null for null metrics', () => {
    expect(getWarmCold(null)).toBeNull();
  });

  it('returns warm for warm=true', () => {
    expect(getWarmCold(makeMetrics(true))).toBe('warm');
  });

  it('returns cold for warm=false', () => {
    expect(getWarmCold(makeMetrics(false))).toBe('cold');
  });
});
