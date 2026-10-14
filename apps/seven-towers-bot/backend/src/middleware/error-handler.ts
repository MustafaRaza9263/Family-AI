import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

function getRequestId(req: Request): string {
  if (typeof req.id === 'string') {
    return req.id;
  }
  const header = req.headers['x-request-id'];
  if (typeof header === 'string') {
    return header;
  }
  return 'unknown';
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Not found',
      requestId: getRequestId(req),
    },
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Express requires 4 args to treat this as an error handler.
  void next;
  const requestId = getRequestId(req);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
      },
    });
    return;
  }

  logger.error({ err, requestId }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId,
    },
  });
};
