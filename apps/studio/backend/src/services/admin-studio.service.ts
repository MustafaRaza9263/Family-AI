import type {
  AdminJobsQuery,
  AdminStatsRange,
  LimitsOverridesDto,
} from '@studio/shared';
import { computeAdminStats } from '../admin/stats.js';
import { rangeWindow } from '../admin/range.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { JobRepository } from '../db/repositories/job-repository.js';
import type { SettingsRepository } from '../db/repositories/settings-repository.js';
import type { UserRepository } from '../db/repositories/user-repository.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { AppError, ErrorCodes } from '../lib/errors.js';
import { toAdminRun } from '../mappers/admin-run.js';
import type { MetricsStore } from '../telemetry/store/types.js';
import type { Telemetry } from '../telemetry/types.js';
import {
  getAdminJob,
  listAdminJobs,
  type AdminJobsDeps,
} from './admin-studio-jobs.js';

const STATS_SCAN_LIMIT = 20_000;

export type AdminStudioServiceDeps = {
  jobs: JobRepository;
  users: UserRepository;
  assets: AssetRepository;
  settings: SettingsRepository;
  metrics: MetricsStore;
  telemetry: Telemetry;
  retentionDays: number;
  now: () => Date;
  wake: () => void;
  setEnginePaused: (paused: boolean) => void;
};

export class AdminStudioService {
  private readonly jobsDeps: AdminJobsDeps;

  constructor(private readonly deps: AdminStudioServiceDeps) {
    this.jobsDeps = {
      jobs: deps.jobs,
      users: deps.users,
      assets: deps.assets,
      metrics: deps.metrics,
      telemetry: deps.telemetry,
      retentionDays: deps.retentionDays,
      now: deps.now,
    };
  }

  listJobs(query: AdminJobsQuery) {
    return listAdminJobs(this.jobsDeps, query);
  }

  getJob(id: string) {
    return getAdminJob(this.jobsDeps, id);
  }

  async getStats(range: AdminStatsRange) {
    const { from, to } = rangeWindow(range, this.deps.now());
    const jobs = await this.deps.jobs.listForStats({
      from,
      to,
      limit: STATS_SCAN_LIMIT + 1,
    });
    const truncated = jobs.length > STATS_SCAN_LIMIT;
    const page = truncated ? jobs.slice(0, STATS_SCAN_LIMIT) : jobs;
    const metrics = await this.deps.metrics.findByJobIds(page.map((j) => j.id));
    const users = await this.deps.users.findByIds([
      ...new Set(page.map((j) => j.userId)),
    ]);
    return computeAdminStats({
      range,
      from,
      to,
      jobs: page,
      metrics,
      users,
      truncated,
    });
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
