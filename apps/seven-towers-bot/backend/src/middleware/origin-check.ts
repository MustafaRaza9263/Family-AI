import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../lib/errors';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Allow same-host, exact Origin match, or same hostname as any allowlisted Origin.
 * Hostname match covers scheme/port variants (http vs https, default ports).
 */
export function isAllowedOrigin(
  origin: string,
  requestHost: string,
  allowedOrigins: readonly string[],
): boolean {
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  if (originUrl.host === requestHost) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  const originHostname = originUrl.hostname;
  for (const allowed of allowedOrigins) {
    try {
      if (new URL(allowed).hostname === originHostname) {
        return true;
      }
    } catch {
      // Skip malformed allowlist entries.
    }
  }

  return false;
}

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

  const requestHost = req.get('host') ?? '';
  if (isAllowedOrigin(origin, requestHost, env.ALLOWED_ORIGINS)) {
    next();
    return;
  }

  req.log?.warn({ origin, requestHost }, 'Origin not allowed');
  next(new AppError(403, ErrorCodes.BAD_ORIGIN, 'Origin not allowed'));
}
