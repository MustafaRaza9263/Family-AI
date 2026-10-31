import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import path from 'node:path';
import type { Db } from 'mongodb';
import type { Env } from './config/env.js';
import type { Clock } from './lib/clock.js';
import { systemClock } from './lib/clock.js';
import type { Logger } from './lib/logger.js';
import type { SessionRepository } from './db/repositories/session-repository.js';
import type { UserRepository } from './db/repositories/user-repository.js';
import type { EventHub } from './events/hub.js';
import { AuthService } from './services/auth.service.js';
import { AdminUsersService } from './services/admin-users.service.js';
import { SessionService } from './services/session.service.js';
import type { CapabilitiesService } from './services/capabilities.service.js';
import type { ThreadService } from './services/thread.service.js';
import type { GenerationQueryService } from './services/generation-query.service.js';
import type { FilesService } from './services/files.service.js';
import type { LibraryService } from './services/library.service.js';
import type { UploadService } from './services/upload.service.js';
import type { AdminStudioService } from './services/admin-studio.service.js';
import { applySecurity } from './middleware/security.js';
import { createOriginCheck } from './middleware/origin-check.js';
import {
  createRateLimiters,
  passthrough,
  type RateLimiters,
} from './middleware/rate-limits.js';
import {
  createRequestLogger,
  ensureRequestId,
} from './middleware/request-logger.js';
import { createSessionMiddleware } from './middleware/session.js';
import { createErrorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { mountFrontendStatic } from './middleware/frontend-static.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createAdminRoutes } from './routes/admin.routes.js';
import { createAdminStudioRoutes } from './routes/admin-studio.routes.js';
import { createHealthRoutes } from './routes/health.routes.js';
import { createCapabilitiesRoutes } from './routes/capabilities.routes.js';
import { createThreadsRoutes } from './routes/threads.routes.js';
import { createGenerationsRoutes } from './routes/generations.routes.js';
import { createEventsRoutes } from './routes/events.routes.js';
import { createFilesRoutes } from './routes/files.routes.js';
import { createLibraryRoutes } from './routes/library.routes.js';
import { createUploadsRoutes } from './routes/uploads.routes.js';

export type StudioApiServices = {
  hub: EventHub;
  capabilities: CapabilitiesService;
  threads: ThreadService;
  generations: GenerationQueryService;
  files: FilesService;
  library: LibraryService;
  uploads: UploadService;
  adminStudio: AdminStudioService;
};

export type AppDeps = {
  env: Env;
  logger: Logger;
  users: UserRepository;
  sessions: SessionRepository;
  db: Db | null;
  clock?: Clock;
  studio?: StudioApiServices;
};

export type AppOptions = {
  /** When true, rate limiters are replaced with no-ops (tests). */
  disableRateLimits?: boolean;
  frontendDistDir?: string;
};

export function createApp(deps: AppDeps, options: AppOptions = {}): Express {
  const clock = deps.clock ?? systemClock;
  const sessionService = new SessionService(
    deps.sessions,
    deps.users,
    deps.env,
    clock,
  );
  const authService = new AuthService(
    deps.users,
    sessionService,
    clock,
    deps.env,
    deps.logger,
  );
  const adminService = new AdminUsersService(
    deps.users,
    sessionService,
    clock,
  );

  const limits: RateLimiters | null = options.disableRateLimits
    ? null
    : createRateLimiters();

  const app = express();
  app.set('trust proxy', deps.env.TRUST_PROXY);

  applySecurity(app, deps.env);
  app.use(ensureRequestId);
  app.use(createRequestLogger(deps.logger));
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use(createOriginCheck(deps.env));
  app.use('/api', limits?.api ?? passthrough);
  app.use(createSessionMiddleware(sessionService, deps.env));

  app.use('/api', createHealthRoutes(deps.db));
  app.use('/api', createAuthRoutes(authService, limits));
  app.use('/api', createAdminRoutes(adminService));

  if (deps.studio) {
    const s = deps.studio;
    app.use('/api', createCapabilitiesRoutes(s.capabilities));
    app.use('/api', createThreadsRoutes(s.threads, s.generations, limits));
    app.use('/api', createGenerationsRoutes(s.generations));
    app.use('/api', createEventsRoutes(s.hub));
    app.use('/api', createFilesRoutes(s.files));
    app.use('/api', createLibraryRoutes(s.library));
    app.use('/api', createUploadsRoutes(s.uploads, limits));
    app.use('/api', createAdminStudioRoutes(s.adminStudio));
  }

  const distDir =
    options.frontendDistDir ??
    path.resolve(process.cwd(), '../frontend/out');
  if (deps.env.NODE_ENV === 'production') {
    mountFrontendStatic(app, distDir, deps.logger);
  } else {
    app.use(notFoundHandler);
  }

  app.use(createErrorHandler(deps.logger));

  return app;
}
