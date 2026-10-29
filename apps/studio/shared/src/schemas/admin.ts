import { z } from 'zod';
import { publicUserSchema, userStatusSchema } from './user.js';

export const adminUserListQuerySchema = z.object({
  status: userStatusSchema.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const adminUserListResponseSchema = z.object({
  items: z.array(publicUserSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  counts: z.object({
    pending: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    disabled: z.number().int().nonnegative(),
  }),
});

export const adminUpdateUserRequestSchema = z.object({
  status: z.enum(['active', 'disabled']),
});

export const adminUpdateUserResponseSchema = z.object({
  user: publicUserSchema,
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;
export type AdminUpdateUserRequest = z.infer<typeof adminUpdateUserRequestSchema>;
export type AdminUpdateUserResponse = z.infer<typeof adminUpdateUserResponseSchema>;
