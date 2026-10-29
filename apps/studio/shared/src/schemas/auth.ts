import { z } from 'zod';
import { publicUserSchema } from './user.js';

export const registerRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(z.string().min(2).max(80)),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128),
  /** Hidden honeypot — bots fill this; humans leave it empty. */
  website: z.string().max(200).optional(),
});

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const registerResponseSchema = z.object({
  status: z.literal('pending'),
});

export const loginResponseSchema = z.object({
  user: publicUserSchema,
});

export const meResponseSchema = z.object({
  user: publicUserSchema,
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
