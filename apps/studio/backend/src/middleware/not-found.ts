import type { RequestHandler } from 'express';
import { ErrorCodes } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  const requestId = typeof req.id === 'string' ? req.id : 'unknown';
  res.status(404).json({
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: 'Not found',
      requestId,
    },
  });
};
