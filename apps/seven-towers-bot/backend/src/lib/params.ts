import type { Request } from 'express';
import { AppError, ErrorCodes } from './errors';

/** Express 5 types params as string | string[]; we always use single route params. */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, `Missing path param: ${name}`);
  }
  return value;
}
