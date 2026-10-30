import { z } from 'zod';
import { adminJobSchema } from './job.js';

export const adminJobsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const adminJobsResponseSchema = z.object({
  items: z.array(adminJobSchema),
  nextCursor: z.string().nullable(),
});

/** Metrics row shape for admin runs (ISO date strings over the wire). */
export const adminRunSchema = z.object({
  jobId: z.string().min(1),
  userId: z.string().min(1),
  recipeId: z.string().min(1),
  tool: z.enum(['image', 'video']),
  status: z.enum(['done', 'failed', 'cancelled']),
  errorCode: z.string().optional(),
  queuedAt: z.string().datetime(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  queueWaitMs: z.number().nonnegative(),
  runMs: z.number().nonnegative(),
  warm: z.boolean(),
  phases: z.object({
    loadMs: z.number().nonnegative(),
    sampleMs: z.number().nonnegative(),
    decodeMs: z.number().nonnegative(),
    otherMs: z.number().nonnegative(),
  }),
});

export const adminRunsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const adminRunsResponseSchema = z.object({
  items: z.array(adminRunSchema),
  nextCursor: z.string().nullable(),
});

export type AdminJobsQuery = z.infer<typeof adminJobsQuerySchema>;
export type AdminRun = z.infer<typeof adminRunSchema>;
export type AdminRunsQuery = z.infer<typeof adminRunsQuerySchema>;
