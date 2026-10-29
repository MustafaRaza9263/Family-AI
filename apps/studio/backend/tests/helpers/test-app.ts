import type { Express } from 'express';
import pino from 'pino';
import { loadEnv, type Env } from '../../src/config/env.js';
import { createApp } from '../../src/app.js';
import type { Clock } from '../../src/lib/clock.js';
import { MemoryUserRepository } from '../fakes/memory-user-repository.js';
import { MemorySessionRepository } from '../fakes/memory-session-repository.js';
import { hashPassword } from '../../src/lib/password.js';

export type TestContext = {
  app: Express;
  users: MemoryUserRepository;
  sessions: MemorySessionRepository;
  env: Env;
  clock: { nowMs: number; now(): Date };
};

export async function buildTestApp(
  overrides: Partial<Env> = {},
): Promise<TestContext> {
  const env = loadEnv({
    NODE_ENV: 'test',
    PORT: '4001',
    LOG_LEVEL: 'silent',
    MONGODB_URI: 'mongodb://mongoadmin:test@127.0.0.1:27017/studio-test?authSource=admin',
    SESSION_COOKIE_NAME: 'studio_sid',
    SESSION_TTL_DAYS: '14',
    TRUST_PROXY: '0',
    DATA_DIR: './data',
    CORS_ORIGIN: 'http://localhost:3001',
    ...overrides,
  } as NodeJS.ProcessEnv);

  const users = new MemoryUserRepository();
  const sessions = new MemorySessionRepository();
  const clock = {
    nowMs: Date.parse('2026-10-28T12:00:00.000Z'),
    now(): Date {
      return new Date(this.nowMs);
    },
  };

  const app = createApp(
    {
      env,
      logger: pino({ level: 'silent' }),
      users,
      sessions,
      db: null,
      clock: clock as Clock,
    },
    { disableRateLimits: true },
  );

  return { app, users, sessions, env, clock };
}

export async function seedActiveUser(
  users: MemoryUserRepository,
  input: {
    email: string;
    fullName: string;
    password: string;
    role?: 'user' | 'admin';
    status?: 'pending' | 'active' | 'disabled';
  },
) {
  const now = new Date('2026-10-28T12:00:00.000Z');
  return users.create({
    email: input.email,
    fullName: input.fullName,
    passwordHash: await hashPassword(input.password),
    role: input.role ?? 'user',
    status: input.status ?? 'active',
    createdAt: now,
    updatedAt: now,
  });
}
