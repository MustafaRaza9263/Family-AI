import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from '../lib/logger.js';

export function createRequestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (_req: IncomingMessage, res: ServerResponse) => {
      const existing = _req.headers['x-request-id'];
      const id =
        typeof existing === 'string' && existing.length > 0
          ? existing
          : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customProps: (req: IncomingMessage) => ({
      requestId: (req as Request).id,
    }),
  });
}

/** Ensure req.id is always a string for error responses. */
export function ensureRequestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (typeof req.id !== 'string' || req.id.length === 0) {
    const id = randomUUID();
    req.id = id;
    res.setHeader('x-request-id', id);
  }
  next();
}
