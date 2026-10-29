import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from '../src/lib/password.js';

describe('password', () => {
  it('hashes and verifies with argon2id', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'correct-horse-battery')).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('verifyAgainstDummy always completes without throwing', async () => {
    await expect(verifyAgainstDummy('anything')).resolves.toBeUndefined();
  });
});
