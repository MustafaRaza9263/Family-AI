import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler';
import { httpLogger } from './middleware/http-logger';
import { attachUser } from './middleware/auth';
import { apiRateLimiter } from './middleware/rate-limiters';
import { mountFrontendStatic } from './middleware/frontend-static';
import { createAdminRoutes } from './routes/admin.routes';
import { createAssetsRoutes } from './routes/assets.routes';
import { authRoutes } from './routes/auth.routes';
import { createChatRoutes } from './routes/chat.routes';
import { conversationsRoutes } from './routes/conversations.routes';
import { createHealthRoutes } from './routes/health.routes';
import type { KnowledgeStore } from './services/knowledge.service';
import type { LlmClient } from './types/llm';

export type AppDeps = {
  llm: LlmClient;
  knowledge: KnowledgeStore;
  /** Test override; production uses FRONTEND_DIST_DIR env. */
  frontendDistDir?: string;
};

export function createApp(deps: AppDeps) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          // Next static export inlines hydration scripts.
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          // null disables the default upgrade-insecure-requests (breaks plain HTTP LAN).
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(httpLogger);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(apiRateLimiter);
  app.use(attachUser);

  // Enrich request logs with user id once known.
  app.use((req, _res, next) => {
    if (req.user && req.log) {
      req.log = req.log.child({ userId: req.user.id });
    }
    next();
  });

  app.use(createHealthRoutes(deps.llm));
  app.use(authRoutes);
  app.use(createChatRoutes(deps));
  app.use(conversationsRoutes);
  app.use(createAssetsRoutes(deps.knowledge));
  app.use(createAdminRoutes(deps.knowledge));

  mountFrontendStatic(app, deps.frontendDistDir);
  app.use(errorHandler);

  return app;
}
