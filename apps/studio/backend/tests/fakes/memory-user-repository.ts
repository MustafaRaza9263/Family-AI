import { randomUUID } from 'node:crypto';
import { AppError, ErrorCodes } from '../../src/lib/errors.js';
import { escapeRegex } from '../../src/lib/escape-regex.js';
import type {
  CreateUserInput,
  ListUsersFilter,
  UpdateStatusInput,
  UserRecord,
  UserRepository,
} from '../../src/db/repositories/user-repository.js';

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();

  async create(input: CreateUserInput): Promise<UserRecord> {
    for (const user of this.users.values()) {
      if (user.email === input.email) {
        throw new AppError(409, ErrorCodes.EMAIL_TAKEN, 'Email is already registered');
      }
    }
    const record: UserRecord = {
      id: randomUUID(),
      email: input.email,
      fullName: input.fullName,
      passwordHash: input.passwordHash,
      role: input.role,
      status: input.status,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
    this.users.set(record.id, record);
    return { ...record };
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return { ...user };
      }
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async list(
    filter: ListUsersFilter,
  ): Promise<{ items: UserRecord[]; total: number }> {
    let items = [...this.users.values()];
    if (filter.status) {
      items = items.filter((u) => u.status === filter.status);
    }
    if (filter.q && filter.q.length > 0) {
      const re = new RegExp(escapeRegex(filter.q), 'i');
      items = items.filter(
        (u) => re.test(u.fullName) || re.test(u.email),
      );
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    return {
      items: items.slice(start, start + filter.limit).map((u) => ({ ...u })),
      total,
    };
  }

  async countByStatus(): Promise<{
    pending: number;
    active: number;
    disabled: number;
  }> {
    const counts = { pending: 0, active: 0, disabled: 0 };
    for (const user of this.users.values()) {
      counts[user.status] += 1;
    }
    return counts;
  }

  async updateStatus(
    id: string,
    input: UpdateStatusInput,
  ): Promise<UserRecord | null> {
    const user = this.users.get(id);
    if (!user) {
      return null;
    }
    user.status = input.status;
    user.updatedAt = input.updatedAt;
    if (input.approvedAt === null) {
      delete user.approvedAt;
    } else if (input.approvedAt instanceof Date) {
      user.approvedAt = input.approvedAt;
    }
    if (input.approvedBy === null) {
      delete user.approvedBy;
    } else if (typeof input.approvedBy === 'string') {
      user.approvedBy = input.approvedBy;
    }
    return { ...user };
  }

  async touchLastLogin(id: string, at: Date): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = at;
      user.updatedAt = at;
    }
  }
}
