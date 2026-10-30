import type { ApiErrorCode, ApiErrorDetail } from '@studio/shared';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[];
  readonly headers?: Record<string, string>;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    options?: { details?: ApiErrorDetail[]; headers?: Record<string, string> },
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.headers = options?.headers;
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_PENDING: 'ACCOUNT_PENDING',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  ORIGIN_NOT_ALLOWED: 'ORIGIN_NOT_ALLOWED',
  QUOTA_DAILY: 'QUOTA_DAILY',
  QUOTA_ACTIVE: 'QUOTA_ACTIVE',
  QUEUE_FULL: 'QUEUE_FULL',
  UNSUPPORTED_COMBINATION: 'UNSUPPORTED_COMBINATION',
  INTERNAL: 'INTERNAL',
} as const satisfies Record<string, ApiErrorCode>;
