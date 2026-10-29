import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { toPublicUser } from '../lib/public-user.js';
import type { SessionService } from '../services/session.service.js';

/** Attach req.auth when the cookie resolves to an active user; clear dead cookies. */
export function createSessionMiddleware(
  sessions: SessionService,
  env: Env,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const rawToken = req.cookies?.[env.SESSION_COOKIE_NAME];
      if (typeof rawToken !== 'string' || rawToken.length === 0) {
        next();
        return;
      }

      const resolved = await sessions.resolve(rawToken);
      if (!resolved) {
        sessions.clearCookie(res, req);
        next();
        return;
      }

      req.auth = {
        user: toPublicUser(resolved.user),
        sessionId: resolved.sessionId,
        rawToken: resolved.rawToken,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}
