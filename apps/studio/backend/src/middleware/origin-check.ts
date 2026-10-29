import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { AppError, ErrorCodes } from '../lib/errors.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Same-origin guard for mutating /api requests.
 * No Origin header (curl / server-to-server) is allowed through.
 */
export function createOriginCheck(env: Env) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.path.startsWith('/api') && !req.originalUrl.startsWith('/api')) {
      next();
      return;
    }
    if (!MUTATING.has(req.method)) {
      next();
      return;
    }

    const origin = req.get('origin');
    if (!origin) {
      next();
      return;
    }

    const host = req.get('host') ?? '';
    let requestOrigin = '';
    try {
      const proto = req.protocol;
      requestOrigin = `${proto}://${host}`;
    } catch {
      requestOrigin = '';
    }

    const allowed =
      origin === requestOrigin ||
      (env.CORS_ORIGIN !== undefined && origin === env.CORS_ORIGIN);

    if (!allowed) {
      next(
        new AppError(
          403,
          ErrorCodes.ORIGIN_NOT_ALLOWED,
          'Origin not allowed',
        ),
      );
      return;
    }

    next();
  };
}
