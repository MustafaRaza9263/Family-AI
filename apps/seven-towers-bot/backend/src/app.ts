import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { httpLogger } from './middleware/http-logger';
import { attachUser } from './middleware/auth';
import { apiRateLimiter } from './middleware/rate-limiters';
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
};

export function createApp(deps: AppDeps) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
