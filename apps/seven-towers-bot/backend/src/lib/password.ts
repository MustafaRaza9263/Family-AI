import { randomBytes } from 'crypto';
import argon2, { type HashOptions } from 'argon2';
import { PASSWORD_MAX, PASSWORD_MIN } from '../config/limits';
import { AppError, ErrorCodes } from './errors';

const ARGON2_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

/** Fixed dummy hash so unknown-email logins take the same time as known ones. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export function assertPasswordRules(password: string, email: string): void {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    const message = `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters`;
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, message, {
      details: [{ path: 'password', message }],
    });
  }
  if (password.toLowerCase() === email.toLowerCase()) {
    const message = 'Password must not equal the email address';
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, message, {
      details: [{ path: 'password', message }],
    });
  }
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Run a verify that always fails, for timing parity on unknown emails. */
export async function verifyAgainstDummy(password: string): Promise<void> {
  try {
    await argon2.verify(DUMMY_HASH, password);
  } catch {
    // Expected — dummy hash is not a real match.
  }
}

export function generateRandomPassword(length = 14): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}
