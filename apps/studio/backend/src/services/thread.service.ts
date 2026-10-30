import { unlink } from 'node:fs/promises';
import type { Clock } from '../lib/clock.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { toAssetDto } from '../mappers/asset.js';
import { toUserJob } from '../mappers/job.js';
import { toThreadDto } from '../mappers/thread.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { JobRepository } from '../db/repositories/job-repository.js';
import type { ThreadRepository } from '../db/repositories/thread-repository.js';
import type { Logger } from '../lib/logger.js';

export type ThreadServiceDeps = {
  threads: ThreadRepository;
  jobs: JobRepository;
  assets: AssetRepository;
  clock: Clock;
  logger: Logger;
};

export class ThreadService {
  constructor(private readonly deps: ThreadServiceDeps) {}

  async create(userId: string, title?: string) {
    const now = this.deps.clock.now();
    const thread = await this.deps.threads.create({
      userId,
      title: title?.trim() ?? '',
      createdAt: now,
      updatedAt: now,
    });
    return { thread: toThreadDto(thread) };
  }

  async list(userId: string, cursor: string | undefined, limit: number) {
    const before = cursor ? decodeCursor(cursor) : null;
    if (cursor && !before) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid cursor');
    }
    const rows = await this.deps.threads.listForUser({
      userId,
      limit: limit + 1,
      before: before
        ? { updatedAt: before.at, id: before.id }
        : undefined,
    });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toThreadDto),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor(last.updatedAt, last.id)
          : null,
    };
  }

  async getDetail(userId: string, threadId: string) {
    const thread = await this.deps.threads.findByIdForUser(threadId, userId);
    if (!thread) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Thread not found');
    }
    const jobs = await this.deps.jobs.listByThread({ threadId });
    const assets = await this.deps.assets.listByThread(threadId);
    const byJob = new Map<string, typeof assets>();
    for (const asset of assets) {
      if (!asset.jobId) continue;
      const list = byJob.get(asset.jobId) ?? [];
      list.push(asset);
      byJob.set(asset.jobId, list);
    }
    return {
      thread: toThreadDto(thread),
      items: jobs.map((job) => ({
        job: toUserJob(job),
        assets: (byJob.get(job.id) ?? []).map(toAssetDto),
      })),
    };
  }

  async softDelete(userId: string, threadId: string): Promise<void> {
    const thread = await this.deps.threads.findByIdForUser(threadId, userId);
    if (!thread) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Thread not found');
    }
    const at = this.deps.clock.now();
    const assets = await this.deps.assets.listByThread(threadId);
    for (const asset of assets) {
      await this.deps.assets.softDelete(asset.id, at);
      await removeFiles(asset.filePath, asset.thumbPath, this.deps.logger);
    }
    await this.deps.threads.softDelete(threadId, at);
  }
}

async function removeFiles(
  filePath: string,
  thumbPath: string,
  logger: Logger,
): Promise<void> {
  for (const p of [filePath, thumbPath]) {
    try {
      await unlink(p);
    } catch (err) {
      logger.warn({ err, path: p }, 'failed to remove asset file');
    }
  }
}
