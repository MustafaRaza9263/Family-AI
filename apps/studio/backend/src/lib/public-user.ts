import type { PublicUser } from '@studio/shared';
import type { UserRecord } from '../db/repositories/user-repository.js';

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
