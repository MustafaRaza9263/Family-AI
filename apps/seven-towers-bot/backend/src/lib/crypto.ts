import { createHash, randomBytes } from 'crypto';

/** 32 random bytes as base64url — this is the raw cookie value. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Store only the SHA-256 hash of the token in Mongo. */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
