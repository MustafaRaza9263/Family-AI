import type { JobStatus, JobTool } from '../documents.js';

export type JobRecord = {
  id: string;
  userId: string;
  threadId: string;
  tool: JobTool;
  recipeId: string;
  variant?: string;
  status: JobStatus;
  prompt: string;
  params: Record<string, string | number | boolean>;
  inputAssetIds: string[];
  outputAssetIds: string[];
  parentAssetId?: string;
  comfyPromptId?: string;
  errorCode?: string;
  errorDetail?: string;
  attempts: number;
  timings: {
    queuedAt: Date;
    startedAt?: Date;
    finishedAt?: Date;
  };
};

export type CreateJobInput = {
  userId: string;
  threadId: string;
  tool: JobTool;
  recipeId: string;
  variant?: string;
  prompt: string;
  params: Record<string, string | number | boolean>;
  inputAssetIds: string[];
  parentAssetId?: string;
  queuedAt: Date;
};

export type FinishJobInput = {
  status: 'done' | 'failed' | 'cancelled';
  finishedAt: Date;
  outputAssetIds?: string[];
  errorCode?: string;
  errorDetail?: string;
};

export type ListJobsByThreadOpts = {
  threadId: string;
};

export type ListAdminJobsOpts = {
  limit: number;
  before?: { queuedAt: Date; id: string };
  status?: JobStatus;
  tool?: JobTool;
  recipeId?: string;
  userIds?: string[];
  promptRegex?: string;
  from?: Date;
  to?: Date;
};

export type ListJobsForStatsOpts = {
  from: Date;
  to: Date;
  limit: number;
};

export interface JobRepository {
  create(input: CreateJobInput): Promise<JobRecord>;
  findById(id: string): Promise<JobRecord | null>;
  listQueued(): Promise<JobRecord[]>;
  listByStatus(status: JobStatus): Promise<JobRecord[]>;
  listByThread(opts: ListJobsByThreadOpts): Promise<JobRecord[]>;
  listAdmin(opts: ListAdminJobsOpts): Promise<JobRecord[]>;
  listForStats(opts: ListJobsForStatsOpts): Promise<JobRecord[]>;
  countByUserAndStatuses(
    userId: string,
    statuses: JobStatus[],
  ): Promise<number>;
  countByStatuses(statuses: JobStatus[]): Promise<number>;
  claim(id: string, startedAt: Date): Promise<JobRecord | null>;
  setComfyPromptId(id: string, promptId: string): Promise<void>;
  finish(id: string, input: FinishJobInput): Promise<JobRecord | null>;
  requeue(id: string): Promise<JobRecord | null>;
  cancelQueued(id: string, userId: string, finishedAt: Date): Promise<JobRecord | null>;
}
