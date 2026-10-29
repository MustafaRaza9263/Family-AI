import argon2 from 'argon2';

/** Explicit argon2id parameters (OWASP recommendation for interactive logins). */
const ARGON2_OPTIONS = {
  type: argon2.argon2id as 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

/**
 * Fixed dummy hash so unknown-email logins take the same time as known ones
 * (avoids leaking whether an email is registered).
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function verifyAgainstDummy(password: string): Promise<void> {
  try {
    await argon2.verify(DUMMY_HASH, password);
  } catch {
    // Expected — dummy hash is not a real match.
  }
}
