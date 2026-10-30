import type { LimitsOverridesDto } from '@studio/shared';
import type { JobRepository } from '../db/repositories/job-repository.js';
import type { SettingsRepository } from '../db/repositories/settings-repository.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { toAdminRun } from '../mappers/admin-run.js';
import { toAdminJob } from '../mappers/job.js';
import type { MetricsStore } from '../telemetry/store/types.js';

export type AdminStudioServiceDeps = {
  jobs: JobRepository;
  settings: SettingsRepository;
  metrics: MetricsStore;
  wake: () => void;
  setEnginePaused: (paused: boolean) => void;
};

export class AdminStudioService {
  constructor(private readonly deps: AdminStudioServiceDeps) {}

  async listJobs(cursor: string | undefined, limit: number) {
    const before = cursor ? decodeCursor(cursor) : null;
    if (cursor && !before) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid cursor');
    }
    const rows = await this.deps.jobs.listAdmin({
      limit: limit + 1,
      before: before
        ? { queuedAt: before.at, id: before.id }
        : undefined,
    });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toAdminJob),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor(last.timings.queuedAt, last.id)
          : null,
    };
  }

  async listRuns(cursor: string | undefined, limit: number) {
    const before = cursor ? decodeCursor(cursor) : null;
    if (cursor && !before) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid cursor');
    }
    const rows = await this.deps.metrics.list({
      limit: limit + 1,
      before: before?.at,
    });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toAdminRun),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor(last.finishedAt, last.jobId)
          : null,
    };
  }

  async getRun(jobId: string) {
    const row = await this.deps.metrics.findByJobId(jobId);
    if (!row) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Run not found');
    }
    return { run: toAdminRun(row) };
  }

  async getEngine() {
    const settings = await this.deps.settings.get();
    return { paused: settings.enginePaused };
  }

  async setEnginePaused(paused: boolean) {
    const settings = await this.deps.settings.setEnginePaused(paused);
    // Monitor publishes the engine SSE event; wake unblocks the worker loop.
    this.deps.setEnginePaused(paused);
    this.deps.wake();
    return { paused: settings.enginePaused };
  }

  async getSettings() {
    const settings = await this.deps.settings.get();
    return {
      enginePaused: settings.enginePaused,
      limits: settings.limits,
    };
  }

  async patchSettings(limits: LimitsOverridesDto) {
    const settings = await this.deps.settings.setLimits(limits);
    return {
      enginePaused: settings.enginePaused,
      limits: settings.limits,
    };
  }
}
