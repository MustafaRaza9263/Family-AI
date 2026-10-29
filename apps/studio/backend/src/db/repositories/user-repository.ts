import type { UserRole, UserStatus } from '@studio/shared';

export type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  lastLoginAt?: Date;
};

export type CreateUserInput = {
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ListUsersFilter = {
  status?: UserStatus;
  q?: string;
  page: number;
  limit: number;
};

export type UpdateStatusInput = {
  status: UserStatus;
  updatedAt: Date;
  approvedAt?: Date | null;
  approvedBy?: string | null;
};

export interface UserRepository {
  create(input: CreateUserInput): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  list(filter: ListUsersFilter): Promise<{ items: UserRecord[]; total: number }>;
  countByStatus(): Promise<{
    pending: number;
    active: number;
    disabled: number;
  }>;
  updateStatus(id: string, input: UpdateStatusInput): Promise<UserRecord | null>;
  touchLastLogin(id: string, at: Date): Promise<void>;
}
