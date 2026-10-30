import { z } from 'zod';

export const jobToolSchema = z.enum(['image', 'video']);

export const jobStatusSchema = z.enum([
  'queued',
  'running',
  'done',
  'failed',
  'cancelled',
]);

export const jobTimingsSchema = z.object({
  queuedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
});

/** User-facing job — never includes recipeId, node, model, or workflow names. */
export const userJobSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  tool: jobToolSchema,
  variant: z.string().optional(),
  status: jobStatusSchema,
  prompt: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  inputAssetIds: z.array(z.string().min(1)),
  outputAssetIds: z.array(z.string().min(1)),
  parentAssetId: z.string().optional(),
  errorCode: z.string().optional(),
  timings: jobTimingsSchema,
});

/** Admin job — includes recipeId for ops. */
export const adminJobSchema = userJobSchema.extend({
  userId: z.string().min(1),
  recipeId: z.string().min(1),
  attempts: z.number().int().nonnegative(),
});

export const createGenerationRequestSchema = z.object({
  tool: jobToolSchema,
  prompt: z.string().min(1).max(1000),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  variant: z.string().optional(),
  inputAssetIds: z.array(z.string().min(1)).max(4).default([]),
});

export const generationResponseSchema = z.object({
  job: userJobSchema,
});

export type UserJob = z.infer<typeof userJobSchema>;
export type AdminJob = z.infer<typeof adminJobSchema>;
export type CreateGenerationRequest = z.infer<typeof createGenerationRequestSchema>;
