import type { NextFunction, Request, Response } from 'express';
import { AppError, ErrorCodes } from '../lib/errors.js';

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    next(new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required'));
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    next(new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required'));
    return;
  }
  if (req.auth.user.role !== 'admin') {
    next(new AppError(403, ErrorCodes.FORBIDDEN, 'Forbidden'));
    return;
  }
  next();
}
