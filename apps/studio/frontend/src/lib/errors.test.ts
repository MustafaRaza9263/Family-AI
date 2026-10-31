import { describe, expect, it } from 'vitest';
import { ERROR_COPY, errorMessage } from './errors';

const REQUIRED = [
  'QUOTA_DAILY',
  'QUOTA_ACTIVE',
  'QUEUE_FULL',
  'UNSUPPORTED_COMBINATION',
  'ENGINE_TIMEOUT',
  'ENGINE_FAILED',
  'ENGINE_BAD_OUTPUT',
  'ENGINE_UNAVAILABLE',
  'ENGINE_CANCELLED',
  'INVALID_INPUT',
  'UPLOAD_TOO_LARGE',
  'UPLOAD_INVALID',
] as const;

describe('ERROR_COPY', () => {
  it('covers every required user-facing code', () => {
    for (const code of REQUIRED) {
      expect(ERROR_COPY[code]).toBeTruthy();
      expect(errorMessage(code)).not.toMatch(/ENGINE_|QUOTA_/);
    }
  });

  it('falls back for unknown codes', () => {
    expect(errorMessage('NOPE')).toMatch(/went wrong/i);
  });
});
