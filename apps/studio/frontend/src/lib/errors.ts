/** User-facing copy for API and job error codes. Keep jargon out of the UI. */
export const ERROR_COPY: Record<string, string> = {
  QUOTA_DAILY: 'You have used all of today’s generations. Try again tomorrow.',
  QUOTA_ACTIVE: 'You already have generations in progress. Wait for one to finish.',
  QUEUE_FULL: 'The queue is full right now. Please try again in a few minutes.',
  UNSUPPORTED_COMBINATION:
    'That combination of settings is not available. Change a setting and try again.',
  ENGINE_TIMEOUT: 'That took too long and was stopped. Please try again.',
  ENGINE_FAILED: 'Something went wrong while generating. Please try again.',
  ENGINE_BAD_OUTPUT: 'The result could not be saved. Please try again.',
  ENGINE_UNAVAILABLE:
    'The studio engine is temporarily unavailable. Please try again shortly.',
  ENGINE_CANCELLED: 'This generation was cancelled.',
  INVALID_INPUT: 'Please check your prompt and settings, then try again.',
  UPLOAD_TOO_LARGE: 'That image is too large. Use a file under 10 MB.',
  UPLOAD_INVALID: 'That file is not a valid JPEG, PNG, or WebP image.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  ACCOUNT_PENDING: 'Your account is waiting for admin approval.',
  ACCOUNT_DISABLED: 'This account has been disabled. Please contact your admin.',
  EMAIL_TAKEN: 'That email is already registered.',
  UNAUTHENTICATED: 'Please sign in to continue.',
  FORBIDDEN: 'You do not have permission to do that.',
  NOT_FOUND: 'We could not find what you were looking for.',
  RATE_LIMITED: 'Too many attempts. Please try again in a few minutes.',
  ORIGIN_NOT_ALLOWED: 'This request was blocked for security reasons.',
  INTERNAL: 'Something went wrong. Please try again.',
};

export const GENERIC_ERROR_COPY =
  'Something went wrong. Please try again.';

export function errorMessage(code: string | undefined): string {
  if (!code) return GENERIC_ERROR_COPY;
  return ERROR_COPY[code] ?? GENERIC_ERROR_COPY;
}
