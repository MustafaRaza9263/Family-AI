import { z } from 'zod';

export const jobStageSchema = z.enum(['preparing', 'generating', 'finishing']);

export const engineStateSchema = z.enum(['ready', 'paused', 'unavailable']);

export const studioEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('job.queued'),
    jobId: z.string().min(1),
    threadId: z.string().min(1),
    position: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('job.position'),
    jobId: z.string().min(1),
    position: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('job.started'),
    jobId: z.string().min(1),
  }),
  z.object({
    type: z.literal('job.progress'),
    jobId: z.string().min(1),
    stage: jobStageSchema,
    value: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({
    type: z.literal('job.done'),
    jobId: z.string().min(1),
    assetIds: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal('job.failed'),
    jobId: z.string().min(1),
    errorCode: z.string().min(1),
  }),
  z.object({
    type: z.literal('job.cancelled'),
    jobId: z.string().min(1),
  }),
  z.object({
    type: z.literal('engine'),
    state: engineStateSchema,
  }),
]);

export type JobStage = z.infer<typeof jobStageSchema>;
export type EngineState = z.infer<typeof engineStateSchema>;
export type StudioEvent = z.infer<typeof studioEventSchema>;
