import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Db } from 'mongodb';
import type { Env } from './config/env.js';
import type { Clock } from './lib/clock.js';
import { systemClock } from './lib/clock.js';
import type { Logger } from './lib/logger.js';
import type { SessionRepository } from './db/repositories/session-repository.js';
import type { UserRepository } from './db/repositories/user-repository.js';
import { AuthService } from './services/auth.service.js';
import { AdminUsersService } from './services/admin-users.service.js';
import { SessionService } from './services/session.service.js';
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
import { createAuthRoutes } from './routes/auth.routes.js';
import { createAdminRoutes } from './routes/admin.routes.js';
import { createHealthRoutes } from './routes/health.routes.js';

export type AppDeps = {
  env: Env;
  logger: Logger;
  users: UserRepository;
  sessions: SessionRepository;
  db: Db | null;
  clock?: Clock;
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

  const distDir =
    options.frontendDistDir ??
    path.resolve(process.cwd(), '../frontend/out');
  if (deps.env.NODE_ENV === 'production' && existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(createErrorHandler(deps.logger));

  return app;
}
