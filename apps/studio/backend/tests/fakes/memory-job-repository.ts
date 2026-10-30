import { randomUUID } from 'node:crypto';
import type { JobStatus } from '../../src/db/documents.js';
import type {
  CreateJobInput,
  FinishJobInput,
  JobRecord,
  JobRepository,
} from '../../src/db/repositories/job-repository.js';

export class MemoryJobRepository implements JobRepository {
  readonly jobs = new Map<string, JobRecord>();

  async create(input: CreateJobInput): Promise<JobRecord> {
    const record: JobRecord = {
      id: randomUUID(),
      userId: input.userId,
      threadId: input.threadId,
      tool: input.tool,
      recipeId: input.recipeId,
      variant: input.variant,
      status: 'queued',
      prompt: input.prompt,
      params: input.params,
      inputAssetIds: [...input.inputAssetIds],
      outputAssetIds: [],
      parentAssetId: input.parentAssetId,
      attempts: 0,
      timings: { queuedAt: input.queuedAt },
    };
    this.jobs.set(record.id, record);
    return clone(record);
  }

  async findById(id: string): Promise<JobRecord | null> {
    const j = this.jobs.get(id);
    return j ? clone(j) : null;
  }

  async listQueued(): Promise<JobRecord[]> {
    return [...this.jobs.values()]
      .filter((j) => j.status === 'queued')
      .map(clone);
  }

  async listByStatus(status: JobStatus): Promise<JobRecord[]> {
    return [...this.jobs.values()].filter((j) => j.status === status).map(clone);
  }

  async countByUserAndStatuses(
    userId: string,
    statuses: JobStatus[],
  ): Promise<number> {
    return [...this.jobs.values()].filter(
      (j) => j.userId === userId && statuses.includes(j.status),
    ).length;
  }

  async countByStatuses(statuses: JobStatus[]): Promise<number> {
    return [...this.jobs.values()].filter((j) =>
      statuses.includes(j.status),
    ).length;
  }

  async claim(id: string, startedAt: Date): Promise<JobRecord | null> {
    const j = this.jobs.get(id);
    if (!j || j.status !== 'queued') return null;
    j.status = 'running';
    j.attempts += 1;
    j.timings.startedAt = startedAt;
    return clone(j);
  }

  async setComfyPromptId(id: string, promptId: string): Promise<void> {
    const j = this.jobs.get(id);
    if (j) j.comfyPromptId = promptId;
  }

  async finish(id: string, input: FinishJobInput): Promise<JobRecord | null> {
    const j = this.jobs.get(id);
    if (!j) return null;
    j.status = input.status;
    j.timings.finishedAt = input.finishedAt;
    if (input.outputAssetIds) j.outputAssetIds = [...input.outputAssetIds];
    if (input.errorCode !== undefined) j.errorCode = input.errorCode;
    return clone(j);
  }

  async requeue(id: string): Promise<JobRecord | null> {
    const j = this.jobs.get(id);
    if (!j || j.status !== 'running') return null;
    j.status = 'queued';
    delete j.timings.startedAt;
    delete j.comfyPromptId;
    delete j.errorCode;
    return clone(j);
  }

  async cancelQueued(
    id: string,
    userId: string,
    finishedAt: Date,
  ): Promise<JobRecord | null> {
    const j = this.jobs.get(id);
    if (!j || j.userId !== userId || j.status !== 'queued') return null;
    j.status = 'cancelled';
    j.timings.finishedAt = finishedAt;
    return clone(j);
  }
}

function clone(j: JobRecord): JobRecord {
  return {
    ...j,
    params: { ...j.params },
    inputAssetIds: [...j.inputAssetIds],
    outputAssetIds: [...j.outputAssetIds],
    timings: { ...j.timings },
  };
}
