import type { Db } from 'mongodb';
import { loadEnv, type Env } from './config/env.js';
import { createComfy, type ComfyClient } from './comfy/index.js';
import { connectMongo } from './db/mongo.js';
import { ensureIndexes } from './db/indexes.js';
import { MongoUserRepository } from './db/repositories/mongo-user-repository.js';
import { MongoSessionRepository } from './db/repositories/mongo-session-repository.js';
import { MongoThreadRepository } from './db/repositories/mongo-thread-repository.js';
import { MongoJobRepository } from './db/repositories/mongo-job-repository.js';
import { MongoAssetRepository } from './db/repositories/mongo-asset-repository.js';
import { MongoUsageDailyRepository } from './db/repositories/mongo-usage-daily-repository.js';
import { MongoSettingsRepository } from './db/repositories/mongo-settings-repository.js';
import { MongoAuditRepository } from './db/repositories/mongo-audit-repository.js';
import type { UserRepository } from './db/repositories/user-repository.js';
import type { SessionRepository } from './db/repositories/session-repository.js';
import type { ThreadRepository } from './db/repositories/thread-repository.js';
import type { JobRepository } from './db/repositories/job-repository.js';
import type { AssetRepository } from './db/repositories/asset-repository.js';
import type { UsageDailyRepository } from './db/repositories/usage-daily-repository.js';
import type { SettingsRepository } from './db/repositories/settings-repository.js';
import type { AuditRepository } from './db/repositories/audit-repository.js';
import { createEventHub, type EventHub } from './events/hub.js';
import { systemClock, type Clock } from './lib/clock.js';
import { createLogger, type Logger } from './lib/logger.js';
import { LimitsService } from './limits/limits.service.js';
import { createQueueWorker, type QueueWorker } from './queue/worker.js';
import { GenerationService } from './services/generation.service.js';
import { CapabilitiesService } from './services/capabilities.service.js';
import { ThreadService } from './services/thread.service.js';
import { GenerationQueryService } from './services/generation-query.service.js';
import { FilesService } from './services/files.service.js';
import { LibraryService } from './services/library.service.js';
import { AdminStudioService } from './services/admin-studio.service.js';
import type { StudioApiServices } from './app.js';
import {
  createTelemetry,
  MongoMetricsStore,
  SystemSampler,
  telemetryConfigFromEnv,
  type Telemetry,
} from './telemetry/index.js';
import type { MetricsStore } from './telemetry/store/types.js';

export type StudioCompose = {
  env: Env;
  logger: Logger;
  db: Db;
  clock: Clock;
  users: UserRepository;
  sessions: SessionRepository;
  threads: ThreadRepository;
  jobs: JobRepository;
  assets: AssetRepository;
  usage: UsageDailyRepository;
  settings: SettingsRepository;
  audit: AuditRepository;
  metrics: MetricsStore;
  comfy: ComfyClient;
  telemetry: Telemetry;
  hub: EventHub;
  limits: LimitsService;
  worker: QueueWorker;
  generation: GenerationService;
  api: StudioApiServices;
};

export async function compose(
  envSource: NodeJS.ProcessEnv = process.env,
): Promise<StudioCompose> {
  const env = loadEnv(envSource);
  const logger = createLogger(env);
  const clock = systemClock;

  const db = await connectMongo(env.MONGODB_URI, logger);
  await ensureIndexes(db);

  const metricsStore = new MongoMetricsStore(
    db.collection('job_metrics'),
    env.TELEMETRY_RETENTION_DAYS,
  );
  await metricsStore.ensureIndexes();

  const users = new MongoUserRepository(db);
  const sessions = new MongoSessionRepository(db);
  const threads = new MongoThreadRepository(db);
  const jobs = new MongoJobRepository(db);
  const assets = new MongoAssetRepository(db);
  const usage = new MongoUsageDailyRepository(db);
  const settings = new MongoSettingsRepository(db);
  const audit = new MongoAuditRepository(db);

  const hub = createEventHub(clock);
  const sampler = new SystemSampler({ logger });
  const telemetry = createTelemetry({
    store: metricsStore,
    sampler,
    logger,
    clock,
    config: telemetryConfigFromEnv(env),
  });

  const reconnectHooks = new Set<() => void>();
  const comfy = await createComfy({
    env,
    logger,
    onReconnect: () => {
      for (const hook of reconnectHooks) hook();
    },
  });

  const limits = new LimitsService({
    usage,
    jobs,
    settings,
    clock,
    timeZone: env.STUDIO_TIMEZONE,
  });

  const worker = createQueueWorker({
    comfy,
    jobs,
    assets,
    settings,
    limits,
    hub,
    telemetry,
    clock,
    logger,
    dataDir: env.DATA_DIR,
    pingIntervalMs: env.ENGINE_PING_INTERVAL_MS,
    retentionDays: env.RETENTION_DAYS,
    registerReconnect: (cb) => {
      reconnectHooks.add(cb);
    },
  });

  const generation = new GenerationService({
    jobs,
    threads,
    limits,
    hub,
    clock,
    recipes: comfy.recipes,
    wake: () => worker.wake(),
    lastServedAt: worker.lastServedAt,
  });

  const capabilities = new CapabilitiesService({
    recipes: comfy.recipes,
    limits,
    getEngineState: () => worker.getEngineState(),
  });
  const threadService = new ThreadService({
    threads,
    jobs,
    assets,
    clock,
    logger,
  });
  const generationQuery = new GenerationQueryService({
    generation,
    jobs,
    threads,
    worker,
    clock,
  });
  const files = new FilesService({
    assets,
    audit,
    clock,
    logger,
    dataDir: env.DATA_DIR,
  });
  const library = new LibraryService(assets);
  const adminStudio = new AdminStudioService({
    jobs,
    settings,
    metrics: metricsStore,
    wake: () => worker.wake(),
    setEnginePaused: (paused) => worker.setEnginePaused(paused),
  });

  const api: StudioApiServices = {
    hub,
    capabilities,
    threads: threadService,
    generations: generationQuery,
    files,
    library,
    adminStudio,
  };

  return {
    env,
    logger,
    db,
    clock,
    users,
    sessions,
    threads,
    jobs,
    assets,
    usage,
    settings,
    audit,
    metrics: metricsStore,
    comfy,
    telemetry,
    hub,
    limits,
    worker,
    generation,
    api,
  };
}
