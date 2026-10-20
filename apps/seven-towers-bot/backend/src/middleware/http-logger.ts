import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger';

export const httpLogger = pinoHttp({
  logger,
  genReqId: (_req: IncomingMessage, res: ServerResponse) => {
    const id = randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
});
