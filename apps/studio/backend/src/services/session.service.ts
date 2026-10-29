import type { CookieOptions, Request, Response } from 'express';
import type { Env } from '../config/env.js';
import type { Clock } from '../lib/clock.js';
import { generateSessionToken, hashToken } from '../lib/session-token.js';
import type { SessionRepository } from '../db/repositories/session-repository.js';
import type { UserRecord, UserRepository } from '../db/repositories/user-repository.js';

const SLIDING_TOUCH_MS = 60 * 60 * 1000;

export type ResolvedSession = {
  sessionId: string;
  rawToken: string;
  user: UserRecord;
};

export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly env: Env,
    private readonly clock: Clock,
  ) {}

  private ttlMs(): number {
    return this.env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  cookieOptions(req: Request): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: req.secure,
      maxAge: this.ttlMs(),
    };
  }

  setCookie(res: Response, req: Request, rawToken: string): void {
    res.cookie(this.env.SESSION_COOKIE_NAME, rawToken, this.cookieOptions(req));
  }

  clearCookie(res: Response, req: Request): void {
    res.clearCookie(this.env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: req.secure,
    });
  }

  async create(userId: string): Promise<string> {
    const rawToken = generateSessionToken();
    const now = this.clock.now();
    await this.sessions.create({
      tokenHash: hashToken(rawToken),
      userId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs()),
    });
    return rawToken;
  }

  /**
   * Resolve a raw cookie token to an active user.
   * Loads the user fresh every time; expired or non-active sessions return null.
   */
  async resolve(rawToken: string): Promise<ResolvedSession | null> {
    const session = await this.sessions.findByTokenHash(hashToken(rawToken));
    if (!session) {
      return null;
    }

    const now = this.clock.now();
    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.sessions.deleteByTokenHash(session.tokenHash);
      return null;
    }

    const user = await this.users.findById(session.userId);
    if (!user || user.status !== 'active') {
      await this.sessions.deleteByTokenHash(session.tokenHash);
      return null;
    }

    if (now.getTime() - session.lastSeenAt.getTime() >= SLIDING_TOUCH_MS) {
      await this.sessions.touch(
        session.id,
        now,
        new Date(now.getTime() + this.ttlMs()),
      );
    }

    return { sessionId: session.id, rawToken, user };
  }

  async deleteByRawToken(rawToken: string): Promise<void> {
    await this.sessions.deleteByTokenHash(hashToken(rawToken));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.sessions.deleteAllForUser(userId);
  }
}
