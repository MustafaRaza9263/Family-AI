import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError, ErrorCodes } from '../lib/errors.js';

function rateLimitedHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
  message: string,
): void {
  next(
    new AppError(429, ErrorCodes.RATE_LIMITED, message, {
      headers: { 'Retry-After': '60' },
    }),
  );
}

export type RateLimiters = {
  api: ReturnType<typeof rateLimit>;
  register: ReturnType<typeof rateLimit>;
  loginIp: ReturnType<typeof rateLimit>;
  loginEmail: ReturnType<typeof rateLimit>;
  generations: ReturnType<typeof rateLimit>;
  uploads: ReturnType<typeof rateLimit>;
};

export function createRateLimiters(): RateLimiters {
  return {
    api: rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next) =>
        rateLimitedHandler(req, res, next, 'Too many requests'),
    }),
    register: rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next) =>
        rateLimitedHandler(req, res, next, 'Too many signups'),
    }),
    loginIp: rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next) =>
        rateLimitedHandler(req, res, next, 'Too many login attempts'),
    }),
    loginEmail: rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 8,
      standardHeaders: true,
      legacyHeaders: false,
      // Only count failures; successful logins skip the limiter.
      skipSuccessfulRequests: true,
      // Key is email, not IP — disable the IP-fallback validation warning.
      validate: { keyGeneratorIpFallback: false },
      keyGenerator: (req) => {
        const email =
          typeof req.body?.email === 'string'
            ? req.body.email.toLowerCase()
            : 'unknown';
        return `login-email:${email}`;
      },
      handler: (req, res, next) =>
        rateLimitedHandler(req, res, next, 'Too many login attempts'),
    }),
    generations: rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      validate: { keyGeneratorIpFallback: false },
      keyGenerator: (req) => {
        const userId = req.auth?.user.id ?? req.ip ?? 'unknown';
        return `generations:${userId}`;
      },
      handler: (req, res, next) =>
        rateLimitedHandler(req, res, next, 'Too many generations'),
    }),
    uploads: rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      validate: { keyGeneratorIpFallback: false },
      keyGenerator: (req) => {
        const userId = req.auth?.user.id ?? req.ip ?? 'unknown';
        return `uploads:${userId}`;
      },
      handler: (req, res, next) =>
        rateLimitedHandler(req, res, next, 'Too many uploads'),
    }),
  };
}

/** No-op middleware used when tests disable rate limits. */
export function passthrough(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next();
}
