import type { Request, Response } from 'express';
import type { LoginRequest, PublicUser, RegisterRequest } from '@studio/shared';
import type { Clock } from '../lib/clock.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import {
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from '../lib/password.js';
import { toPublicUser } from '../lib/public-user.js';
import type { Env } from '../config/env.js';
import type { UserRepository } from '../db/repositories/user-repository.js';
import type { SessionService } from './session.service.js';

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionService,
    private readonly clock: Clock,
    private readonly env: Env,
    private readonly logger: Logger,
  ) {}

  async register(body: RegisterRequest): Promise<{ status: 'pending' }> {
    // Honeypot: pretend success without creating an account.
    if (body.website && body.website.trim().length > 0) {
      this.logger.info({ flag: 'honeypot' }, 'Signup honeypot tripped');
      return { status: 'pending' };
    }

    const now = this.clock.now();
    const passwordHash = await hashPassword(body.password);
    await this.users.create({
      email: body.email,
      fullName: body.fullName,
      passwordHash,
      role: 'user',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return { status: 'pending' };
  }

  async login(
    body: LoginRequest,
    req: Request,
    res: Response,
  ): Promise<PublicUser> {
    const user = await this.users.findByEmail(body.email);

    if (!user) {
      await verifyAgainstDummy(body.password);
      throw new AppError(
        401,
        ErrorCodes.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    const ok = await verifyPassword(user.passwordHash, body.password);
    if (!ok) {
      throw new AppError(
        401,
        ErrorCodes.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    // Status is checked only after a correct password.
    if (user.status === 'pending') {
      throw new AppError(
        403,
        ErrorCodes.ACCOUNT_PENDING,
        'Account is pending admin approval',
      );
    }
    if (user.status === 'disabled') {
      throw new AppError(
        403,
        ErrorCodes.ACCOUNT_DISABLED,
        'Account is disabled',
      );
    }

    const existing = req.cookies?.[this.env.SESSION_COOKIE_NAME];
    if (typeof existing === 'string' && existing.length > 0) {
      await this.sessions.deleteByRawToken(existing);
    }

    const now = this.clock.now();
    await this.users.touchLastLogin(user.id, now);
    const rawToken = await this.sessions.create(user.id);
    this.sessions.setCookie(res, req, rawToken);

    return toPublicUser({ ...user, lastLoginAt: now, status: 'active' });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const rawToken = req.cookies?.[this.env.SESSION_COOKIE_NAME];
    if (typeof rawToken === 'string' && rawToken.length > 0) {
      await this.sessions.deleteByRawToken(rawToken);
    }
    this.sessions.clearCookie(res, req);
  }
}
