import { describe, expect, it } from 'vitest';
import { LimitsService } from '../../src/limits/limits.service.js';
import { AppError, ErrorCodes } from '../../src/lib/errors.js';
import { MemoryJobRepository } from '../fakes/memory-job-repository.js';
import { MemorySettingsRepository } from '../fakes/memory-settings-repository.js';
import { MemoryUsageDailyRepository } from '../fakes/memory-usage-daily-repository.js';
import { mutableClock } from '../telemetry/helpers.js';

function makeService(overrides?: {
  dailyImage?: number;
  globalQueued?: number;
}) {
  const usage = new MemoryUsageDailyRepository();
  const jobs = new MemoryJobRepository();
  const settings = new MemorySettingsRepository();
  const clock = mutableClock(Date.parse('2026-10-30T12:00:00Z'));
  if (
    overrides?.dailyImage !== undefined ||
    overrides?.globalQueued !== undefined
  ) {
    void settings.setLimits({
      dailyRuns:
        overrides.dailyImage !== undefined
          ? { image: overrides.dailyImage }
          : undefined,
      globalQueued: overrides.globalQueued,
    });
  }
  const limits = new LimitsService({
    usage,
    jobs,
    settings,
    clock,
    timeZone: 'UTC',
  });
  return { limits, usage, jobs, settings, clock };
}

describe('LimitsService', () => {
  it('reserveRun stops at the daily limit', async () => {
    const { limits, usage } = makeService({ dailyImage: 2 });
    await limits.reserveRun('u1', 'image');
    await limits.reserveRun('u1', 'image');
    await expect(limits.reserveRun('u1', 'image')).rejects.toMatchObject({
      code: ErrorCodes.QUOTA_DAILY,
    });
    expect((await usage.find('u1', '2026-10-30', 'image'))?.runs).toBe(2);
  });

  it('reserveRun is safe under concurrency at the boundary', async () => {
    const { limits, usage } = makeService({ dailyImage: 5 });
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => limits.reserveRun('u1', 'image')),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const denied = results.filter(
      (r) =>
        r.status === 'rejected' &&
        r.reason instanceof AppError &&
        r.reason.code === ErrorCodes.QUOTA_DAILY,
    ).length;
    expect(ok).toBe(5);
    expect(denied).toBe(15);
    expect((await usage.find('u1', '2026-10-30', 'image'))?.runs).toBe(5);
  });

  it('refunds when shouldRefund says so', async () => {
    const { limits, usage } = makeService();
    await limits.reserveRun('u1', 'image');
    expect(limits.shouldRefund({ wasQueued: true, status: 'cancelled' })).toBe(
      true,
    );
    await limits.refundRun('u1', 'image');
    expect((await usage.find('u1', '2026-10-30', 'image'))?.runs).toBe(0);

    expect(
      limits.shouldRefund({
        wasQueued: false,
        status: 'failed',
        errorCode: 'ENGINE_FAILED',
      }),
    ).toBe(true);
    expect(
      limits.shouldRefund({ wasQueued: false, status: 'cancelled' }),
    ).toBe(false);
  });

  it('checkSubmit throws the documented codes', async () => {
    const { limits, jobs } = makeService({ dailyImage: 1, globalQueued: 1 });
    await limits.reserveRun('u1', 'image');
    await expect(limits.checkSubmit('u1', 'image')).rejects.toMatchObject({
      code: ErrorCodes.QUOTA_DAILY,
    });

    const { limits: limits2, jobs: jobs2 } = makeService({ globalQueued: 30 });
    await jobs2.create({
      userId: 'u1',
      threadId: 't1',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: new Date(),
    });
    // running 1 + queued 3 = 4 active max; add 3 more queued + pretend one running
    for (let i = 0; i < 3; i++) {
      await jobs2.create({
        userId: 'u1',
        threadId: 't1',
        tool: 'image',
        recipeId: 'image-create-fast',
        prompt: 'x',
        params: {},
        inputAssetIds: [],
        queuedAt: new Date(),
      });
    }
    const running = await jobs2.create({
      userId: 'u1',
      threadId: 't1',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: new Date(),
    });
    await jobs2.claim(running.id, new Date());
    await expect(limits2.checkSubmit('u1', 'image')).rejects.toMatchObject({
      code: ErrorCodes.QUOTA_ACTIVE,
    });

    const { limits: limits3, jobs: jobs3 } = makeService({ globalQueued: 1 });
    await jobs3.create({
      userId: 'other',
      threadId: 't',
      tool: 'image',
      recipeId: 'image-create-fast',
      prompt: 'x',
      params: {},
      inputAssetIds: [],
      queuedAt: new Date(),
    });
    await expect(limits3.checkSubmit('fresh', 'image')).rejects.toMatchObject({
      code: ErrorCodes.QUEUE_FULL,
    });
    void jobs;
  });
});
