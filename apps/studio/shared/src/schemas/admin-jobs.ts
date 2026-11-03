import { z } from 'zod';
import { assetSchema } from './asset.js';
import { engineStateSchema, jobStageSchema } from './events.js';
import { jobStatusSchema, jobToolSchema } from './job.js';

const iso = z.string().datetime();

export const adminJobUserSchema = z.object({
  id: z.string().min(1),
  fullName: z.string(),
  email: z.string().email(),
});

export const adminJobOutputSchema = z.object({
  assetId: z.string().min(1),
  kind: z.enum(['image', 'video']),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  durationSec: z.number().nonnegative().optional(),
});

export const adminJobMetricsSummarySchema = z.object({
  warm: z.boolean(),
  gpuUtilPeak: z.number().nullable(),
  memUsedPeakMb: z.number().nullable(),
  swapDeltaMb: z.number().nullable(),
});

/** Wire shape for a finished job_metrics row (ISO dates). */
export const adminJobMetricsSchema = z.object({
  jobId: z.string().min(1),
  userId: z.string().min(1),
  recipeId: z.string().min(1),
  tool: jobToolSchema,
  status: z.enum(['done', 'failed', 'cancelled']),
  errorCode: z.string().optional(),
  queuedAt: iso,
  startedAt: iso,
  finishedAt: iso,
  queueWaitMs: z.number().nonnegative(),
  runMs: z.number().nonnegative(),
  output: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      frames: z.number().optional(),
      bytes: z.number().optional(),
    })
    .optional(),
  nodes: z.array(
    z.object({
      nodeId: z.string(),
      class: z.string(),
      title: z.string().optional(),
      ms: z.number().nonnegative(),
      cached: z.boolean(),
    }),
  ),
  phases: z.object({
    loadMs: z.number().nonnegative(),
    sampleMs: z.number().nonnegative(),
    decodeMs: z.number().nonnegative(),
    otherMs: z.number().nonnegative(),
    enhanceMs: z.number().nonnegative().optional(),
  }),
  hardware: z.object({
    samples: z.number().int().nonnegative(),
    gpuUtilAvg: z.number().nullable(),
    gpuUtilPeak: z.number().nullable(),
    powerAvgW: z.number().nullable(),
    powerPeakW: z.number().nullable(),
    tempPeakC: z.number().nullable(),
    memUsedAvgMb: z.number().nullable(),
    memUsedPeakMb: z.number().nullable(),
    memAvailableMinMb: z.number().nullable(),
    swapUsedStartMb: z.number().nullable(),
    swapUsedPeakMb: z.number().nullable(),
    memTotalMb: z.number().nullable(),
    gpuAvailable: z.boolean(),
  }),
  warm: z.boolean(),
  createdAt: iso,
});

/** Mid-run telemetry peek — open node carries running:true. */
export const adminLiveSnapshotSchema = z.object({
  jobId: z.string().min(1),
  nodes: z.array(
    z.object({
      nodeId: z.string(),
      class: z.string(),
      title: z.string().optional(),
      ms: z.number().nonnegative(),
      cached: z.boolean(),
      running: z.literal(true).optional(),
    }),
  ),
  phases: z.object({
    loadMs: z.number().nonnegative(),
    sampleMs: z.number().nonnegative(),
    decodeMs: z.number().nonnegative(),
    otherMs: z.number().nonnegative(),
    enhanceMs: z.number().nonnegative().optional(),
  }),
  hardware: adminJobMetricsSchema.shape.hardware,
  elapsedMs: z.number().nonnegative(),
});

export const adminJobRowSchema = z.object({
  id: z.string().min(1),
  status: jobStatusSchema,
  tool: jobToolSchema,
  recipeId: z.string().min(1),
  variant: z.string().optional(),
  prompt: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  user: adminJobUserSchema,
  queuedAt: iso,
  startedAt: iso.optional(),
  finishedAt: iso.optional(),
  queueWaitMs: z.number().nonnegative().optional(),
  runMs: z.number().nonnegative().optional(),
  errorCode: z.string().optional(),
  outputs: z.array(adminJobOutputSchema),
  inputAssetIds: z.array(z.string().min(1)),
  metrics: adminJobMetricsSummarySchema.nullable(),
});

export const adminJobDetailSchema = adminJobRowSchema.extend({
  attempts: z.number().int().nonnegative(),
  errorDetail: z.string().max(500).optional(),
  parentAssetId: z.string().optional(),
  threadId: z.string().min(1),
  inputAssets: z.array(assetSchema),
  outputAssets: z.array(assetSchema),
  metricsFull: adminJobMetricsSchema.nullable(),
  metricsExpired: z.boolean().optional(),
  live: adminLiveSnapshotSchema.optional(),
});

export const adminJobsQuerySchema = z.object({
  status: jobStatusSchema.optional(),
  tool: jobToolSchema.optional(),
  recipe: z.string().min(1).optional(),
  user: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  from: iso.optional(),
  to: iso.optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

export const adminJobsResponseSchema = z.object({
  items: z.array(adminJobRowSchema),
  nextCursor: z.string().nullable(),
});

export const adminJobDetailResponseSchema = z.object({
  job: adminJobDetailSchema,
});

export const adminStatsRangeSchema = z.enum(['24h', '7d', '30d']);

export const adminRecipeStatsSchema = z.object({
  recipeId: z.string().min(1),
  runs: z.number().int().nonnegative(),
  done: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
  successRate: z.number().nullable(),
  runMsP50: z.number().nullable(),
  runMsP95: z.number().nullable(),
  warmRate: z.number().nullable(),
  coldMedianRunMs: z.number().nullable(),
  warmMedianRunMs: z.number().nullable(),
  gpuUtilAvg: z.number().nullable(),
  memUsedPeakMax: z.number().nullable(),
  swapDeltaMax: z.number().nullable(),
});

export const adminStatsSchema = z.object({
  range: adminStatsRangeSchema,
  from: iso,
  to: iso,
  truncated: z.boolean(),
  counts: z.object({
    total: z.number().int().nonnegative(),
    done: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative(),
    running: z.number().int().nonnegative(),
  }),
  successRate: z.number().nullable(),
  queueWaitP50: z.number().nullable(),
  queueWaitP95: z.number().nullable(),
  recipes: z.array(adminRecipeStatsSchema),
  topErrors: z.array(
    z.object({ code: z.string(), count: z.number().int().positive() }),
  ),
  topUsers: z.array(
    z.object({
      userId: z.string().min(1),
      fullName: z.string(),
      email: z.string().email(),
      runs: z.number().int().positive(),
    }),
  ),
});

export const adminStatsQuerySchema = z.object({
  range: adminStatsRangeSchema.default('24h'),
});

export const adminHardwareSampleSchema = z.object({
  at: iso,
  gpuUtilPct: z.number().nullable(),
  powerW: z.number().nullable(),
  tempC: z.number().nullable(),
  memUsedMb: z.number().nullable(),
  memAvailableMb: z.number().nullable(),
  swapUsedMb: z.number().nullable(),
  memTotalMb: z.number().nullable(),
});

export const adminLivePayloadSchema = z.object({
  type: z.literal('admin.live'),
  engine: engineStateSchema,
  queued: z.number().int().nonnegative(),
  running: z
    .object({
      jobId: z.string().min(1),
      userName: z.string(),
      recipeId: z.string().min(1),
      stage: jobStageSchema,
      startedAt: iso,
    })
    .nullable(),
  hardware: adminHardwareSampleSchema.nullable(),
});

/** Job events for admins carry the owning userId; engine events may omit it. */
export const adminEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('job.queued'),
    jobId: z.string().min(1),
    threadId: z.string().min(1),
    position: z.number().int().positive(),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal('job.position'),
    jobId: z.string().min(1),
    position: z.number().int().positive(),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal('job.started'),
    jobId: z.string().min(1),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal('job.progress'),
    jobId: z.string().min(1),
    stage: jobStageSchema,
    value: z.number().optional(),
    max: z.number().optional(),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal('job.done'),
    jobId: z.string().min(1),
    assetIds: z.array(z.string().min(1)),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal('job.failed'),
    jobId: z.string().min(1),
    errorCode: z.string().min(1),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal('job.cancelled'),
    jobId: z.string().min(1),
    userId: z.string().min(1),
  }),
  z.object({
    type: z.literal('engine'),
    state: engineStateSchema,
    userId: z.string().optional(),
  }),
  adminLivePayloadSchema,
]);

export type AdminJobRow = z.infer<typeof adminJobRowSchema>;
export type AdminJobDetail = z.infer<typeof adminJobDetailSchema>;
export type AdminJobsQuery = z.infer<typeof adminJobsQuerySchema>;
export type AdminStats = z.infer<typeof adminStatsSchema>;
export type AdminStatsQuery = z.infer<typeof adminStatsQuerySchema>;
export type AdminStatsRange = z.infer<typeof adminStatsRangeSchema>;
export type AdminEvent = z.infer<typeof adminEventSchema>;
export type AdminLiveSnapshot = z.infer<typeof adminLiveSnapshotSchema>;
export type AdminJobMetrics = z.infer<typeof adminJobMetricsSchema>;
