import type { ObjectId } from 'mongodb';
import type { UserRole, UserStatus } from '@studio/shared';

export type UserDocument = {
  _id: ObjectId;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: ObjectId;
  lastLoginAt?: Date;
};

export type SessionDocument = {
  _id: ObjectId;
  tokenHash: string;
  userId: ObjectId;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};
