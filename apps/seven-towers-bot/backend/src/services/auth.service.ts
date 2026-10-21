import type { Request, Response } from 'express';
import { env } from '../config/env';
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILURES } from '../config/limits';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import {
  assertPasswordRules,
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from '../lib/password';
import { normalizePhone } from '../lib/phone';
import { User } from '../models/user.model';
import type { AuthUser } from '../types/express';
import type { LoginBody, RegisterBody } from '../validators/auth.schemas';
import {
  clearSessionCookie,
  createSession,
  deleteAllSessionsForUser,
  deleteSession,
  setSessionCookie,
} from './session.service';

function toPublicUser(user: {
  _id: { toString(): string };
  fullName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  mustChangePassword: boolean;
}): AuthUser {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function register(body: RegisterBody): Promise<{ ok: true }> {
  // Honeypot: pretend success without creating an account.
  if (body.website && body.website.trim().length > 0) {
    logger.info({ flag: 'honeypot' }, 'Signup honeypot tripped');
    return { ok: true };
  }

  assertPasswordRules(body.password, body.email);
  const phone = normalizePhone(body.phone);

  const existing = await User.findOne({ email: body.email });
  if (existing) {
    throw new AppError(409, ErrorCodes.EMAIL_TAKEN, 'Email is already registered');
  }

  const passwordHash = await hashPassword(body.password);
  await User.create({
    email: body.email,
    fullName: body.fullName,
    phone,
    passwordHash,
    role: 'user',
    status: 'pending',
  });

  // No session until an admin approves (status → active) and the user signs in.
  return { ok: true };
}

export async function login(
  body: LoginBody,
  req: Request,
  res: Response,
): Promise<AuthUser> {
  const user = await User.findOne({ email: body.email });

  if (!user) {
    await verifyAgainstDummy(body.password);
    throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const retryAfterSec = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    throw new AppError(429, ErrorCodes.ACCOUNT_LOCKED, 'Account is temporarily locked', {
      headers: { 'Retry-After': String(retryAfterSec) },
    });
  }

  const ok = await verifyPassword(user.passwordHash, body.password);
  if (!ok) {
    const failures = (user.failedLoginCount ?? 0) + 1;
    if (failures >= LOGIN_MAX_FAILURES) {
      const lockedUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
      user.failedLoginCount = 0;
      user.lockedUntil = lockedUntil;
      await user.save();
      throw new AppError(429, ErrorCodes.ACCOUNT_LOCKED, 'Account is temporarily locked', {
        headers: { 'Retry-After': String(LOGIN_LOCK_MINUTES * 60) },
      });
    }
    user.failedLoginCount = failures;
    await user.save();
    throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  if (user.status === 'pending') {
    throw new AppError(
      403,
      ErrorCodes.ACCOUNT_PENDING,
      'Account is pending admin approval',
    );
  }

  if (user.status === 'disabled') {
    throw new AppError(403, ErrorCodes.ACCOUNT_DISABLED, 'Account is disabled');
  }

  user.failedLoginCount = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const rawToken = await createSession(user._id.toString(), req);
  setSessionCookie(res, req, rawToken);
  return toPublicUser(user);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.[env.COOKIE_NAME];
  if (typeof rawToken === 'string') {
    await deleteSession(rawToken);
  }
  clearSessionCookie(res, req);
}

export async function changePassword(
  userId: string,
  sessionId: string,
  currentPassword: string,
  newPassword: string,
  email: string,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, ErrorCodes.UNAUTHENTICATED, 'Authentication required');
  }

  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) {
    throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  if (currentPassword === newPassword) {
    throw new AppError(
      400,
      ErrorCodes.VALIDATION_ERROR,
      'New password must differ from the current password',
    );
  }

  assertPasswordRules(newPassword, email);
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  await deleteAllSessionsForUser(userId, sessionId);
}
