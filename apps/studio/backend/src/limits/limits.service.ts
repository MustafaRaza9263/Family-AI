import { AppError, ErrorCodes } from '../lib/errors.js';
import type { Clock } from '../lib/clock.js';
import type { JobTool } from '../db/documents.js';
import type { JobRepository } from '../db/repositories/job-repository.js';
import type { SettingsRepository } from '../db/repositories/settings-repository.js';
import type { UsageDailyRepository } from '../db/repositories/usage-daily-repository.js';
import { dayKey } from './day-key.js';
import { DEFAULT_LIMITS, type LimitsConfig } from './defaults.js';

const REFUNDABLE_ERRORS = new Set([
  'ENGINE_FAILED',
  'ENGINE_UNAVAILABLE',
  'ENGINE_BAD_OUTPUT',
]);

export type RemainingForTool = {
  dailyRuns: number;
  used: number;
  remaining: number;
};

export type LimitsServiceDeps = {
  usage: UsageDailyRepository;
  jobs: JobRepository;
  settings: SettingsRepository;
  clock: Clock;
  timeZone: string;
};

export class LimitsService {
  private readonly usage: UsageDailyRepository;
  private readonly jobs: JobRepository;
  private readonly settings: SettingsRepository;
  private readonly clock: Clock;
  private readonly timeZone: string;

  constructor(deps: LimitsServiceDeps) {
    this.usage = deps.usage;
    this.jobs = deps.jobs;
    this.settings = deps.settings;
    this.clock = deps.clock;
    this.timeZone = deps.timeZone;
  }

  async resolvedLimits(): Promise<LimitsConfig> {
    const settings = await this.settings.get();
    const o = settings.limits;
    return {
      dailyRuns: {
        image: o.dailyRuns?.image ?? DEFAULT_LIMITS.dailyRuns.image,
        video: o.dailyRuns?.video ?? DEFAULT_LIMITS.dailyRuns.video,
      },
      perUserRunning: o.perUserRunning ?? DEFAULT_LIMITS.perUserRunning,
      perUserQueued: o.perUserQueued ?? DEFAULT_LIMITS.perUserQueued,
      globalQueued: o.globalQueued ?? DEFAULT_LIMITS.globalQueued,
    };
  }

  async checkSubmit(userId: string, tool: JobTool): Promise<void> {
    const limits = await this.resolvedLimits();
    const day = dayKey(this.clock.now(), this.timeZone);
    const used = (await this.usage.find(userId, day, tool))?.runs ?? 0;
    if (used >= limits.dailyRuns[tool]) {
      throw new AppError(429, ErrorCodes.QUOTA_DAILY, 'Daily run quota reached');
    }

    const active = await this.jobs.countByUserAndStatuses(userId, [
      'running',
      'queued',
    ]);
    if (active >= limits.perUserRunning + limits.perUserQueued) {
      throw new AppError(
        429,
        ErrorCodes.QUOTA_ACTIVE,
        'Too many active jobs',
      );
    }

    const globalQueued = await this.jobs.countByStatuses(['queued']);
    if (globalQueued >= limits.globalQueued) {
      throw new AppError(503, ErrorCodes.QUEUE_FULL, 'Queue is full');
    }
  }

  async reserveRun(userId: string, tool: JobTool): Promise<void> {
    const limits = await this.resolvedLimits();
    const day = dayKey(this.clock.now(), this.timeZone);
    const row = await this.usage.tryIncrementRuns(
      userId,
      day,
      tool,
      limits.dailyRuns[tool],
    );
    if (!row) {
      throw new AppError(429, ErrorCodes.QUOTA_DAILY, 'Daily run quota reached');
    }
  }

  async refundRun(userId: string, tool: JobTool): Promise<void> {
    const day = dayKey(this.clock.now(), this.timeZone);
    await this.usage.refundRun(userId, day, tool);
  }

  shouldRefund(opts: {
    wasQueued: boolean;
    status: 'failed' | 'cancelled';
    errorCode?: string;
  }): boolean {
    if (opts.status === 'cancelled' && opts.wasQueued) return true;
    if (
      opts.status === 'failed' &&
      opts.errorCode !== undefined &&
      REFUNDABLE_ERRORS.has(opts.errorCode)
    ) {
      return true;
    }
    return false;
  }

  async addGpuSeconds(
    userId: string,
    tool: JobTool,
    runMs: number,
  ): Promise<void> {
    const day = dayKey(this.clock.now(), this.timeZone);
    await this.usage.addGpuSeconds(userId, day, tool, runMs / 1000);
  }

  async remaining(
    userId: string,
  ): Promise<{ image: RemainingForTool; video: RemainingForTool }> {
    const limits = await this.resolvedLimits();
    const day = dayKey(this.clock.now(), this.timeZone);
    const [imageUsed, videoUsed] = await Promise.all([
      this.usage.find(userId, day, 'image'),
      this.usage.find(userId, day, 'video'),
    ]);
    return {
      image: remainingFor(limits.dailyRuns.image, imageUsed?.runs ?? 0),
      video: remainingFor(limits.dailyRuns.video, videoUsed?.runs ?? 0),
    };
  }
}

function remainingFor(dailyRuns: number, used: number): RemainingForTool {
  return {
    dailyRuns,
    used,
    remaining: Math.max(0, dailyRuns - used),
  };
}
