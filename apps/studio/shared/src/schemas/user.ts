import { z } from 'zod';

export const userRoleSchema = z.enum(['user', 'admin']);
export const userStatusSchema = z.enum(['pending', 'active', 'disabled']);

export const publicUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: userRoleSchema,
  status: userStatusSchema,
  createdAt: z.string().datetime(),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
