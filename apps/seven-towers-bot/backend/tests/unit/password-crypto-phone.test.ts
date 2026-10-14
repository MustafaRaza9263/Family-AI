import { describe, expect, it } from 'vitest';
import { generateSessionToken, hashToken } from '../../src/lib/crypto';
import { hashPassword, verifyPassword } from '../../src/lib/password';
import { normalizePhone } from '../../src/lib/phone';

describe('password', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(hash.startsWith('$argon2')).toBe(true);
    expect(await verifyPassword(hash, 'correct-horse-battery')).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });
});

describe('crypto', () => {
  it('generates unique tokens and hashes them', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(hashToken(a)).toHaveLength(64);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(hashToken(b));
  });
});

describe('phone', () => {
  it('normalises +92 and local PK formats', () => {
    expect(normalizePhone('+923001234567')).toBe('+923001234567');
    expect(normalizePhone('03001234567')).toBe('+923001234567');
  });
});
