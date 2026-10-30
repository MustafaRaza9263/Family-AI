import { z } from 'zod';
import { assetSchema } from './asset.js';
import { userJobSchema } from './job.js';

export const threadSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createThreadRequestSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

export const createThreadResponseSchema = z.object({
  thread: threadSchema,
});

export const threadListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const threadListResponseSchema = z.object({
  items: z.array(threadSchema),
  nextCursor: z.string().nullable(),
});

export const threadItemSchema = z.object({
  job: userJobSchema,
  assets: z.array(assetSchema),
});

export const threadDetailResponseSchema = z.object({
  thread: threadSchema,
  items: z.array(threadItemSchema),
});

export type ThreadDto = z.infer<typeof threadSchema>;
export type ThreadListQuery = z.infer<typeof threadListQuerySchema>;
export type ThreadDetailResponse = z.infer<typeof threadDetailResponseSchema>;
