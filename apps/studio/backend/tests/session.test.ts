import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { SessionService } from '../src/services/session.service.js';
import { hashToken } from '../src/lib/session-token.js';
import { MemoryUserRepository } from './fakes/memory-user-repository.js';
import { MemorySessionRepository } from './fakes/memory-session-repository.js';
import { hashPassword } from '../src/lib/password.js';

describe('SessionService', () => {
  async function setup() {
    const env = loadEnv({
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://mongoadmin:test@127.0.0.1:27017/studio?authSource=admin',
      DATA_DIR: './data',
      SESSION_TTL_DAYS: '14',
    });
    const users = new MemoryUserRepository();
    const sessions = new MemorySessionRepository();
    const clock = {
      nowMs: Date.parse('2026-10-28T12:00:00.000Z'),
      now() {
        return new Date(this.nowMs);
      },
    };
    const service = new SessionService(sessions, users, env, clock);
    const user = await users.create({
      email: 'ada@example.com',
      fullName: 'Ada',
      passwordHash: await hashPassword('password1234'),
      role: 'user',
      status: 'active',
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    return { service, users, sessions, clock, user };
  }

  it('resolves a valid session', async () => {
    const { service, user } = await setup();
    const raw = await service.create(user.id);
    const resolved = await service.resolve(raw);
    expect(resolved?.user.id).toBe(user.id);
  });

  it('rejects an expired session', async () => {
    const { service, sessions, clock, user } = await setup();
    const raw = await service.create(user.id);
    const stored = await sessions.findByTokenHash(hashToken(raw));
    expect(stored).not.toBeNull();
    if (!stored) {
      return;
    }
    // Force expiry in the past.
    await sessions.touch(
      stored.id,
      clock.now(),
      new Date(clock.nowMs - 1000),
    );
    expect(await service.resolve(raw)).toBeNull();
  });

  it('rejects a disabled user and deletes the session', async () => {
    const { service, users, sessions, user } = await setup();
    const raw = await service.create(user.id);
    await users.updateStatus(user.id, {
      status: 'disabled',
      updatedAt: new Date(),
    });
    expect(await service.resolve(raw)).toBeNull();
    expect(sessions.countForUser(user.id)).toBe(0);
  });

  it('slides expiry only after one hour of inactivity', async () => {
    const { service, sessions, clock, user } = await setup();
    const raw = await service.create(user.id);
    const before = await sessions.findByTokenHash(hashToken(raw));
    expect(before).not.toBeNull();
    if (!before) {
      return;
    }
    clock.nowMs += 30 * 60 * 1000;
    await service.resolve(raw);
    const mid = await sessions.findByTokenHash(hashToken(raw));
    expect(mid?.lastSeenAt.getTime()).toBe(before.lastSeenAt.getTime());

    clock.nowMs += 40 * 60 * 1000;
    await service.resolve(raw);
    const after = await sessions.findByTokenHash(hashToken(raw));
    expect(after).not.toBeNull();
    if (!after) {
      return;
    }
    expect(after.lastSeenAt.getTime()).toBeGreaterThan(before.lastSeenAt.getTime());
  });
});
