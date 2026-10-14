import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../lib/errors';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Same-origin guard for mutating requests.
 * No Origin header (curl / server-to-server) is allowed through.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  if (!origin) {
    next();
    return;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    next(new AppError(403, ErrorCodes.BAD_ORIGIN, 'Invalid Origin'));
    return;
  }

  const requestHost = req.get('host') ?? '';
  if (originHost === requestHost || env.ALLOWED_ORIGINS.includes(origin)) {
    next();
    return;
  }

  next(new AppError(403, ErrorCodes.BAD_ORIGIN, 'Origin not allowed'));
}
