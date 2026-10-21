import { z } from 'zod';
import { PASSWORD_MAX, PASSWORD_MIN } from '../config/limits';

export const adminUsersQuerySchema = z.object({
  query: z.string().optional().default(''),
  status: z.enum(['pending', 'active', 'disabled']).optional(),
  role: z.enum(['user', 'admin']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Admins may approve (active) or disable; pending is only set at signup. */
export const adminStatusBodySchema = z.object({
  status: z.enum(['active', 'disabled']),
});

export const adminRoleBodySchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const adminResetPasswordBodySchema = z.object({
  newPassword: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX).optional(),
});

export const adminAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

export const adminIdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId'),
});
