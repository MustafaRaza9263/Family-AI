import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';
import { SESSION_RENEW_AFTER_MINUTES } from '../config/limits';
import { generateSessionToken, hashToken } from '../lib/crypto';
import { Session } from '../models/session.model';
import { User } from '../models/user.model';
import type { AuthUser } from '../types/express';

function sessionMaxAgeMs(): number {
  return env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function cookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: req.secure,
    maxAge: sessionMaxAgeMs(),
  };
}

export function setSessionCookie(res: Response, req: Request, rawToken: string): void {
  res.cookie(env.COOKIE_NAME, rawToken, cookieOptions(req));
}

export function clearSessionCookie(res: Response, req: Request): void {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: req.secure,
  });
}

function toAuthUser(user: {
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

export async function createSession(userId: string, req: Request): Promise<string> {
  const rawToken = generateSessionToken();
  const now = new Date();
  await Session.create({
    tokenHash: hashToken(rawToken),
    userId,
    expiresAt: new Date(now.getTime() + sessionMaxAgeMs()),
    lastSeenAt: now,
    ip: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  });
  return rawToken;
}

export async function findValidSession(rawToken: string): Promise<{
  sessionId: string;
  user: AuthUser;
  status: 'active' | 'disabled';
  lastSeenAt: Date;
  expiresAt: Date;
} | null> {
  const session = await Session.findOne({
    tokenHash: hashToken(rawToken),
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    return null;
  }

  const user = await User.findById(session.userId);
  if (!user) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  return {
    sessionId: session._id.toString(),
    user: toAuthUser(user),
    status: user.status,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
  };
}

/** Sliding renewal: only bump when lastSeenAt is older than SESSION_RENEW_AFTER_MINUTES. */
export async function maybeRenewSession(
  sessionId: string,
  lastSeenAt: Date,
  res: Response,
  req: Request,
  rawToken: string,
): Promise<void> {
  const renewAfterMs = SESSION_RENEW_AFTER_MINUTES * 60 * 1000;
  if (Date.now() - lastSeenAt.getTime() < renewAfterMs) {
    return;
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionMaxAgeMs());
  await Session.updateOne(
    { _id: sessionId },
    { $set: { lastSeenAt: now, expiresAt } },
  );
  setSessionCookie(res, req, rawToken);
}

export async function deleteSession(rawToken: string): Promise<void> {
  await Session.deleteOne({ tokenHash: hashToken(rawToken) });
}

export async function deleteAllSessionsForUser(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  const filter: Record<string, unknown> = { userId };
  if (exceptSessionId) {
    filter._id = { $ne: exceptSessionId };
  }
  await Session.deleteMany(filter);
}
