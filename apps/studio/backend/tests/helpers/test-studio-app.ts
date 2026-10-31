import type { Express } from 'express';
import pino from 'pino';
import { loadEnv, type Env } from '../../src/config/env.js';
import { createApp, type StudioApiServices } from '../../src/app.js';
import type { Clock } from '../../src/lib/clock.js';
import { createEventHub } from '../../src/events/hub.js';
import { LimitsService } from '../../src/limits/limits.service.js';
import { CapabilitiesService } from '../../src/services/capabilities.service.js';
import { ThreadService } from '../../src/services/thread.service.js';
import { GenerationService } from '../../src/services/generation.service.js';
import { GenerationQueryService } from '../../src/services/generation-query.service.js';
import { FilesService } from '../../src/services/files.service.js';
import { LibraryService } from '../../src/services/library.service.js';
import { UploadService } from '../../src/services/upload.service.js';
import { AdminStudioService } from '../../src/services/admin-studio.service.js';
import { MemoryUserRepository } from '../fakes/memory-user-repository.js';
import { MemorySessionRepository } from '../fakes/memory-session-repository.js';
import { MemoryThreadRepository } from '../fakes/memory-thread-repository.js';
import { MemoryJobRepository } from '../fakes/memory-job-repository.js';
import { MemoryAssetRepository } from '../fakes/memory-asset-repository.js';
import { MemoryUsageDailyRepository } from '../fakes/memory-usage-daily-repository.js';
import { MemorySettingsRepository } from '../fakes/memory-settings-repository.js';
import { MemoryAuditRepository } from '../fakes/memory-audit-repository.js';
import { MemoryMetricsStore } from '../../src/telemetry/store/memory-store.js';
import { sampleRecipe } from '../comfy/helpers/sample-recipe.js';
import { hashPassword } from '../../src/lib/password.js';
import type { QueueWorker } from '../../src/queue/worker.js';
import type { EngineState } from '@studio/shared';
import type { UserRecord } from '../../src/db/repositories/user-repository.js';

export type StudioTestContext = {
  app: Express;
  users: MemoryUserRepository;
  sessions: MemorySessionRepository;
  threads: MemoryThreadRepository;
  jobs: MemoryJobRepository;
  assets: MemoryAssetRepository;
  audit: MemoryAuditRepository;
  hub: ReturnType<typeof createEventHub>;
  env: Env;
  clock: { nowMs: number; now(): Date };
  worker: QueueWorker;
};

export async function buildStudioTestApp(
  overrides: NodeJS.ProcessEnv = {},
): Promise<StudioTestContext> {
  const env = loadEnv({
    NODE_ENV: 'test',
    PORT: '4001',
    LOG_LEVEL: 'silent',
    MONGODB_URI:
      'mongodb://mongoadmin:test@127.0.0.1:27017/studio-test?authSource=admin',
    SESSION_COOKIE_NAME: 'studio_sid',
    SESSION_TTL_DAYS: '14',
    TRUST_PROXY: '0',
    DATA_DIR: './tmp/test-data',
    CORS_ORIGIN: 'http://localhost:3001',
    ...overrides,
  });

  const users = new MemoryUserRepository();
  const sessions = new MemorySessionRepository();
  const threads = new MemoryThreadRepository();
  const jobs = new MemoryJobRepository();
  const assets = new MemoryAssetRepository();
  const usage = new MemoryUsageDailyRepository();
  const settings = new MemorySettingsRepository();
  const audit = new MemoryAuditRepository();
  const metrics = new MemoryMetricsStore();
  const clock = {
    nowMs: Date.parse('2026-10-30T12:00:00.000Z'),
    now(): Date {
      return new Date(this.nowMs);
    },
  };
  const logger = pino({ level: 'silent' });
  const hub = createEventHub(clock as Clock);
  const lastServedAt = new Map<string, number>();
  let engineState: EngineState = 'ready';

  const worker: QueueWorker = {
    lastServedAt,
    start: async () => undefined,
    stop: async () => undefined,
    wake: () => undefined,
    cancel: async (jobId, userId) => {
      const job = await jobs.findById(jobId);
      if (!job || job.userId !== userId) return false;
      if (job.status === 'queued') {
        await jobs.cancelQueued(jobId, userId, clock.now());
        hub.publish(userId, { type: 'job.cancelled', jobId });
        return true;
      }
      return false;
    },
    getEngineState: () => engineState,
    setEnginePaused: (paused) => {
      engineState = paused ? 'paused' : 'ready';
      hub.publishAll({ type: 'engine', state: engineState });
    },
  };

  const limits = new LimitsService({
    usage,
    jobs,
    settings,
    clock: clock as Clock,
    timeZone: 'UTC',
  });

  const recipe = sampleRecipe();
  const recipes = new Map([[recipe.id, recipe]]);

  const generation = new GenerationService({
    jobs,
    threads,
    assets,
    limits,
    hub,
    clock: clock as Clock,
    recipes,
    wake: () => worker.wake(),
    lastServedAt,
  });

  const api: StudioApiServices = {
    hub,
    capabilities: new CapabilitiesService({
      recipes,
      limits,
      getEngineState: () => worker.getEngineState(),
    }),
    threads: new ThreadService({ threads, jobs, assets, clock: clock as Clock, logger }),
    generations: new GenerationQueryService({
      generation,
      jobs,
      threads,
      worker,
      clock: clock as Clock,
    }),
    files: new FilesService({
      assets,
      audit,
      clock: clock as Clock,
      logger,
      dataDir: env.DATA_DIR,
    }),
    library: new LibraryService(assets),
    uploads: new UploadService({
      assets,
      dataDir: env.DATA_DIR,
      clock: clock as Clock,
    }),
    adminStudio: new AdminStudioService({
      jobs,
      settings,
      metrics,
      wake: () => worker.wake(),
      setEnginePaused: (p) => worker.setEnginePaused(p),
    }),
  };

  const app = createApp(
    {
      env,
      logger,
      users,
      sessions,
      db: null,
      clock: clock as Clock,
      studio: api,
    },
    { disableRateLimits: true },
  );

  return {
    app,
    users,
    sessions,
    threads,
    jobs,
    assets,
    audit,
    hub,
    env,
    clock,
    worker,
  };
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
): Promise<UserRecord> {
  const now = new Date('2026-10-30T12:00:00.000Z');
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

export async function loginAgent(
  app: Express,
  email: string,
  password: string,
) {
  const request = (await import('supertest')).default;
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  expectOkLogin(res.status);
  return agent;
}

function expectOkLogin(status: number): void {
  if (status !== 200) {
    throw new Error(`login failed with status ${status}`);
  }
}
