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

export type ThreadDocument = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

export type JobStatus =
  | 'queued'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled';

export type JobTool = 'image' | 'video';

export type JobTimings = {
  queuedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
};

export type JobDocument = {
  _id: ObjectId;
  userId: ObjectId;
  threadId: ObjectId;
  tool: JobTool;
  recipeId: string;
  variant?: string;
  status: JobStatus;
  prompt: string;
  params: Record<string, string | number | boolean>;
  inputAssetIds: ObjectId[];
  outputAssetIds: ObjectId[];
  parentAssetId?: ObjectId;
  comfyPromptId?: string;
  errorCode?: string;
  attempts: number;
  timings: JobTimings;
};

export type AssetKind = 'image' | 'video';
export type AssetSource = 'upload' | 'generated';

export type AssetDocument = {
  _id: ObjectId;
  userId: ObjectId;
  threadId?: ObjectId;
  jobId?: ObjectId;
  kind: AssetKind;
  filePath: string;
  thumbPath: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  durationSec?: number;
  source: AssetSource;
  parentAssetId?: ObjectId;
  createdAt: Date;
  deletedAt?: Date;
};

export type UsageDailyDocument = {
  _id: ObjectId;
  userId: ObjectId;
  day: string;
  tool: JobTool;
  runs: number;
  gpuSeconds: number;
};

export type LimitsOverrides = {
  dailyRuns?: { image?: number; video?: number };
  perUserRunning?: number;
  perUserQueued?: number;
  globalQueued?: number;
};

export type SettingsDocument = {
  _id: ObjectId;
  enginePaused: boolean;
  limits: LimitsOverrides;
};
