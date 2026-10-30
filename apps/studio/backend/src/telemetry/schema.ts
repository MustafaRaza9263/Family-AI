import { z } from 'zod';

export const nodeTimingSchema = z.object({
  nodeId: z.string(),
  class: z.string(),
  title: z.string().optional(),
  ms: z.number().nonnegative(),
  cached: z.boolean(),
});

export const phasesSchema = z.object({
  loadMs: z.number().nonnegative(),
  sampleMs: z.number().nonnegative(),
  decodeMs: z.number().nonnegative(),
  otherMs: z.number().nonnegative(),
});

export const hardwareSummarySchema = z.object({
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
});

export const jobOutputSchema = z
  .object({
    width: z.number().optional(),
    height: z.number().optional(),
    frames: z.number().optional(),
    bytes: z.number().optional(),
  })
  .optional();

/** Persisted per-job metrics row. Validated before every store.save. */
export const jobMetricsRowSchema = z.object({
  jobId: z.string().min(1),
  userId: z.string().min(1),
  recipeId: z.string().min(1),
  tool: z.enum(['image', 'video']),
  status: z.enum(['done', 'failed', 'cancelled']),
  errorCode: z.string().optional(),
  queuedAt: z.date(),
  startedAt: z.date(),
  finishedAt: z.date(),
  queueWaitMs: z.number().nonnegative(),
  runMs: z.number().nonnegative(),
  output: jobOutputSchema,
  nodes: z.array(nodeTimingSchema),
  phases: phasesSchema,
  hardware: hardwareSummarySchema,
  createdAt: z.date(),
});

export type JobMetricsRow = z.infer<typeof jobMetricsRowSchema>;
