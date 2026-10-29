import { registerRequestSchema } from '@studio/shared';
import { z } from 'zod';

/** Client-only extension: confirm password must match. */
export const registerFormSchema = registerRequestSchema
  .extend({
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
