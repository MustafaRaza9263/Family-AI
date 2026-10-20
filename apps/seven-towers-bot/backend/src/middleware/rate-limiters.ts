import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  API_PER_MINUTE_PER_IP,
  CHAT_PER_DAY,
  CHAT_PER_MINUTE,
  LOGINS_PER_15_MIN_PER_IP,
  SIGNUPS_PER_HOUR_PER_IP,
} from '../config/limits';
import { AppError, ErrorCodes } from '../lib/errors';

/**
 * In-memory store resets on process restart — fine for a single process.
 * Handlers call next(AppError) so the JSON error shape stays consistent.
 */
function rateLimitedHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
  options: { message: string },
): void {
  next(new AppError(429, ErrorCodes.RATE_LIMITED, options.message));
}

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: API_PER_MINUTE_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) =>
    rateLimitedHandler(req, res, next, { message: 'Too many requests' }),
});

export const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: SIGNUPS_PER_HOUR_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) =>
    rateLimitedHandler(req, res, next, { message: 'Too many signups' }),
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: LOGINS_PER_15_MIN_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) =>
    rateLimitedHandler(req, res, next, { message: 'Too many login attempts' }),
});

/** Chat limiters key by authenticated user id (requireAuth runs first). */
export const chatPerMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: CHAT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (!req.user?.id) {
      throw new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required');
    }
    return req.user.id;
  },
  // User-id keys are not IPs; disable the IPv6 IP-helper validation.
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res, next) =>
    rateLimitedHandler(req, res, next, { message: 'Chat rate limit exceeded' }),
});

export const chatPerDayLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: CHAT_PER_DAY,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (!req.user?.id) {
      throw new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required');
    }
    return req.user.id;
  },
  validate: { keyGeneratorIpFallback: false },
  handler: (req, res, next) =>
    rateLimitedHandler(req, res, next, { message: 'Daily chat limit exceeded' }),
});
