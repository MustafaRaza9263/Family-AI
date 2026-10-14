import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { httpLogger } from './middleware/http-logger';
import { healthRoutes } from './routes/health.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(httpLogger);
  app.use(healthRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
