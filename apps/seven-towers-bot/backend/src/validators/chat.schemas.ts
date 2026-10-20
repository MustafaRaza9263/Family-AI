import { z } from 'zod';
import { env } from '../config/env';

export const chatBodySchema = z.object({
  conversationId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId')
    .optional(),
  projectId: z.string().min(1).default(env.DEFAULT_PROJECT_ID),
  message: z.string(),
});

export type ChatBody = z.infer<typeof chatBodySchema>;

export const conversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime().optional(),
});

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId'),
});
