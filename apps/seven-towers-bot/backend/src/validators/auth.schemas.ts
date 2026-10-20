import { z } from 'zod';
import { PASSWORD_MAX, PASSWORD_MIN } from '../config/limits';

const fullNameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().min(2).max(80));

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254);

const passwordSchema = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

export const registerBodySchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: z.string().min(1),
  password: passwordSchema,
  website: z.string().optional(),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
