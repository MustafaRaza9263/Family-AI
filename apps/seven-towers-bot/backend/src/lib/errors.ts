/** Typed application errors. Codes match SOURCE_OF_TRUTH / task section 14 exactly. */

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: { details?: unknown; headers?: Record<string, string> },
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
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
  BAD_ORIGIN: 'BAD_ORIGIN',
  NOT_FOUND: 'NOT_FOUND',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ALREADY_STREAMING: 'ALREADY_STREAMING',
  BUSY: 'BUSY',
  LLM_UNAVAILABLE: 'LLM_UNAVAILABLE',
  CONFIG_ERROR: 'CONFIG_ERROR',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
