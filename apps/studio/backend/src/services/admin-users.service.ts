import type {
  AdminUserListQuery,
  AdminUserListResponse,
  PublicUser,
} from '@studio/shared';
import type { Clock } from '../lib/clock.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { toPublicUser } from '../lib/public-user.js';
import type { UserRepository } from '../db/repositories/user-repository.js';
import type { SessionService } from './session.service.js';

export class AdminUsersService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionService,
    private readonly clock: Clock,
  ) {}

  async list(query: AdminUserListQuery): Promise<AdminUserListResponse> {
    const [listed, counts] = await Promise.all([
      this.users.list({
        status: query.status,
        q: query.q,
        page: query.page,
        limit: query.limit,
      }),
      this.users.countByStatus(),
    ]);

    return {
      items: listed.items.map(toPublicUser),
      total: listed.total,
      page: query.page,
      limit: query.limit,
      counts,
    };
  }

  async setStatus(
    actorId: string,
    targetId: string,
    status: 'active' | 'disabled',
  ): Promise<PublicUser> {
    if (actorId === targetId) {
      throw new AppError(
        403,
        ErrorCodes.FORBIDDEN,
        'You cannot change your own account status',
      );
    }

    const target = await this.users.findById(targetId);
    if (!target) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }
    if (target.role !== 'user') {
      throw new AppError(
        403,
        ErrorCodes.FORBIDDEN,
        'Admin accounts cannot be changed through this API',
      );
    }

    if (target.status === status) {
      return toPublicUser(target);
    }

    const allowed =
      (target.status === 'pending' && (status === 'active' || status === 'disabled')) ||
      (target.status === 'active' && status === 'disabled') ||
      (target.status === 'disabled' && status === 'active');

    if (!allowed) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Status transition is not allowed');
    }

    const now = this.clock.now();
    const updated = await this.users.updateStatus(targetId, {
      status,
      updatedAt: now,
      ...(target.status === 'pending' && status === 'active'
        ? { approvedAt: now, approvedBy: actorId }
        : {}),
    });

    if (!updated) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    if (status === 'disabled') {
      await this.sessions.deleteAllForUser(targetId);
    }

    return toPublicUser(updated);
  }
}
