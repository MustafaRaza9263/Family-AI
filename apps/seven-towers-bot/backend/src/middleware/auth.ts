import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../lib/errors';
import {
  clearSessionCookie,
  deleteSession,
  findValidSession,
  maybeRenewSession,
} from '../services/session.service';

/** Resolve cookie into req.user / req.sessionId. Never rejects. */
export async function attachUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawToken = req.cookies?.[env.COOKIE_NAME];
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      next();
      return;
    }

    const found = await findValidSession(rawToken);
    if (!found) {
      clearSessionCookie(res, req);
      next();
      return;
    }

    req.user = found.user;
    req.sessionId = found.sessionId;
    req.accountStatus = found.status;
    await maybeRenewSession(found.sessionId, found.lastSeenAt, res, req, rawToken);
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user || !req.sessionId) {
      next(new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required'));
      return;
    }

    if (req.accountStatus === 'pending' || req.accountStatus === 'disabled') {
      const rawToken = req.cookies?.[env.COOKIE_NAME];
      if (typeof rawToken === 'string') {
        await deleteSession(rawToken);
      }
      clearSessionCookie(res, req);
      if (req.accountStatus === 'pending') {
        next(
          new AppError(
            403,
            ErrorCodes.ACCOUNT_PENDING,
            'Account is pending admin approval',
          ),
        );
        return;
      }
      next(new AppError(403, ErrorCodes.ACCOUNT_DISABLED, 'Account is disabled'));
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(role: 'admin') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      next(new AppError(403, ErrorCodes.FORBIDDEN, 'Forbidden'));
      return;
    }
    next();
  };
}

const PASSWORD_CHANGE_ALLOWED = new Set([
  '/api/auth/me',
  '/api/auth/change-password',
  '/api/auth/logout',
]);

export function requirePasswordChanged(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.user?.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.has(req.path)) {
    next(
      new AppError(
        403,
        ErrorCodes.PASSWORD_CHANGE_REQUIRED,
        'Password change required',
      ),
    );
    return;
  }
  next();
}
