import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'INVALID_CREDENTIALS',
  'ACCOUNT_PENDING',
  'ACCOUNT_DISABLED',
  'EMAIL_TAKEN',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'ORIGIN_NOT_ALLOWED',
  'QUOTA_DAILY',
  'QUOTA_ACTIVE',
  'QUEUE_FULL',
  'UNSUPPORTED_COMBINATION',
  'INTERNAL',
]);

export const apiErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    requestId: z.string(),
    details: z.array(apiErrorDetailSchema).optional(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
