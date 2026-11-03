import { describe, expect, it } from 'vitest';
import { adminJobDetailResponseSchema, adminJobRowSchema } from '@studio/shared';
import type { JobRecord } from '../../src/db/repositories/job-repository.js';
import {
  toAdminJobDetail,
  toAdminJobRow,
} from '../../src/mappers/admin-job.js';
import type { JobMetricsRow } from '../../src/telemetry/schema.js';

describe('toAdminJobRow', () => {
  it('omits nullish optional fields so Zod client parse succeeds', () => {
    const job = {
      id: 'j1',
      userId: 'u1',
      threadId: 't1',
      tool: 'video' as const,
      recipeId: 'video-from-text',
      variant: null as unknown as undefined,
      status: 'done' as const,
      prompt: 'hello',
      params: { aspectRatio: '16:9' },
      inputAssetIds: [],
      outputAssetIds: [],
      errorCode: null as unknown as undefined,
      attempts: 1,
      timings: { queuedAt: new Date('2026-11-01T00:00:00.000Z') },
    } satisfies JobRecord;

    const row = toAdminJobRow(job, undefined, [], null);
    expect(row.variant).toBeUndefined();
    expect(row.user.email).toBe('unknown@invalid.local');
    // Mimic Express JSON: undefined keys are dropped; null would break Zod.
    const wire = JSON.parse(JSON.stringify(row)) as unknown;
    expect(wire).not.toHaveProperty('variant');
    const parsed = adminJobRowSchema.safeParse(wire);
    expect(parsed.success).toBe(true);
  });

  it('strips null frames from metrics output for image jobs', () => {
    const queuedAt = new Date('2026-11-01T00:00:00.000Z');
    const startedAt = new Date('2026-11-01T00:00:01.000Z');
    const finishedAt = new Date('2026-11-01T00:00:02.000Z');
    const job: JobRecord = {
      id: 'j1',
      userId: 'u1',
      threadId: 't1',
      tool: 'image',
      recipeId: 'image-create-fast',
      status: 'done',
      prompt: 'hello',
      params: {},
      inputAssetIds: [],
      outputAssetIds: [],
      attempts: 1,
      timings: { queuedAt, startedAt, finishedAt },
    };
    const metrics = {
      jobId: 'j1',
      userId: 'u1',
      recipeId: 'image-create-fast',
      tool: 'image',
      status: 'done',
      queuedAt,
      startedAt,
      finishedAt,
      queueWaitMs: 1000,
      runMs: 1000,
      output: {
        width: 512,
        height: 512,
        frames: null as unknown as undefined,
        bytes: 100,
      },
      nodes: [],
      phases: { loadMs: 0, sampleMs: 0, decodeMs: 0, otherMs: 0 },
      hardware: {
        samples: 1,
        gpuUtilAvg: 1,
        gpuUtilPeak: 1,
        powerAvgW: 1,
        powerPeakW: 1,
        tempPeakC: 1,
        memUsedAvgMb: 1,
        memUsedPeakMb: 1,
        memAvailableMinMb: 1,
        swapUsedStartMb: 0,
        swapUsedPeakMb: 0,
        memTotalMb: 1,
        gpuAvailable: true,
      },
      warm: true,
      createdAt: finishedAt,
    } satisfies JobMetricsRow;

    const detail = toAdminJobDetail({
      job,
      user: {
        id: 'u1',
        email: 'a@example.com',
        fullName: 'A',
        passwordHash: 'x',
        role: 'user',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      inputAssets: [],
      outputAssets: [],
      metrics,
    });
    const wire = JSON.parse(JSON.stringify({ job: detail })) as unknown;
    expect(
      (wire as { job: { metricsFull: { output: Record<string, unknown> } } })
        .job.metricsFull.output,
    ).not.toHaveProperty('frames');
    expect(adminJobDetailResponseSchema.safeParse(wire).success).toBe(true);
  });
});
