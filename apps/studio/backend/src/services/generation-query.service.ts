import type { JobRepository } from '../db/repositories/job-repository.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { toUserJob } from '../mappers/job.js';
import type { QueueWorker } from '../queue/worker.js';
import type { GenerationService } from './generation.service.js';
import type { ThreadRepository } from '../db/repositories/thread-repository.js';
import type { Clock } from '../lib/clock.js';
import { titleFromPrompt } from '../lib/title-from-prompt.js';

export type GenerationQueryServiceDeps = {
  generation: GenerationService;
  jobs: JobRepository;
  threads: ThreadRepository;
  worker: QueueWorker;
  clock: Clock;
};

export class GenerationQueryService {
  constructor(private readonly deps: GenerationQueryServiceDeps) {}

  async create(userId: string, threadId: string, body: unknown) {
    const thread = await this.deps.threads.findByIdForUser(threadId, userId);
    if (!thread) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Thread not found');
    }

    const job = await this.deps.generation.createGeneration(
      userId,
      threadId,
      body,
    );

    if (!thread.title.trim()) {
      await this.deps.threads.setTitle(
        threadId,
        titleFromPrompt(job.prompt),
        this.deps.clock.now(),
      );
    }

    return { job: toUserJob(job) };
  }

  async get(userId: string, jobId: string, isAdmin: boolean) {
    const job = await this.deps.jobs.findById(jobId);
    if (!job) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Job not found');
    }
    if (job.userId !== userId && !isAdmin) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Forbidden');
    }
    return { job: toUserJob(job) };
  }

  async cancel(userId: string, jobId: string): Promise<void> {
    const job = await this.deps.jobs.findById(jobId);
    if (!job || job.userId !== userId) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Job not found');
    }
    const ok = await this.deps.worker.cancel(jobId, userId);
    if (!ok) {
      throw new AppError(
        409,
        ErrorCodes.VALIDATION_ERROR,
        'Job cannot be cancelled',
      );
    }
  }
}
