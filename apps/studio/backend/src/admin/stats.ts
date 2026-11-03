import type { AdminStats } from '@studio/shared';
import type { JobRecord } from '../db/repositories/job-repository.js';
import type { UserRecord } from '../db/repositories/user-repository.js';
import type { JobMetricsRow } from '../telemetry/schema.js';

export type StatsInput = {
  range: '24h' | '7d' | '30d';
  from: Date;
  to: Date;
  jobs: JobRecord[];
  metrics: JobMetricsRow[];
  users: UserRecord[];
  truncated: boolean;
};

/** Nearest-rank percentile; empty → null. */
export function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank));
  return sortedAsc[idx] ?? null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const high = sorted[mid];
  if (sorted.length % 2 === 1) return high ?? null;
  const low = sorted[mid - 1];
  if (low === undefined || high === undefined) return null;
  return (low + high) / 2;
}

function swapDelta(row: JobMetricsRow): number | null {
  const start = row.hardware.swapUsedStartMb;
  const peak = row.hardware.swapUsedPeakMb;
  if (start === null || peak === null) return null;
  return peak - start;
}

/** Pure aggregation over job + metrics projections for the admin Overview. */
export function computeAdminStats(input: StatsInput): AdminStats {
  const { jobs, metrics, users, truncated, range, from, to } = input;
  const byJob = new Map(metrics.map((m) => [m.jobId, m]));
  const byUser = new Map(users.map((u) => [u.id, u]));

  const counts = {
    total: jobs.length,
    done: 0,
    failed: 0,
    cancelled: 0,
    queued: 0,
    running: 0,
  };
  const queueWaits: number[] = [];
  const errorCounts = new Map<string, number>();
  const userRuns = new Map<string, number>();
  const recipeBuckets = new Map<
    string,
    {
      runs: number;
      done: number;
      failed: number;
      cancelled: number;
      runMs: number[];
      warm: number;
      warmKnown: number;
      coldRunMs: number[];
      warmRunMs: number[];
      gpuUtils: number[];
      memPeaks: number[];
      swapDeltas: number[];
    }
  >();

  for (const job of jobs) {
    counts[job.status] += 1;
    userRuns.set(job.userId, (userRuns.get(job.userId) ?? 0) + 1);
    if (job.errorCode) {
      errorCounts.set(job.errorCode, (errorCounts.get(job.errorCode) ?? 0) + 1);
    }

    const m = byJob.get(job.id);
    const queueWait =
      m?.queueWaitMs ??
      (job.timings.startedAt
        ? Math.max(
            0,
            job.timings.startedAt.getTime() - job.timings.queuedAt.getTime(),
          )
        : undefined);
    if (queueWait !== undefined) queueWaits.push(queueWait);

    let bucket = recipeBuckets.get(job.recipeId);
    if (!bucket) {
      bucket = {
        runs: 0,
        done: 0,
        failed: 0,
        cancelled: 0,
        runMs: [],
        warm: 0,
        warmKnown: 0,
        coldRunMs: [],
        warmRunMs: [],
        gpuUtils: [],
        memPeaks: [],
        swapDeltas: [],
      };
      recipeBuckets.set(job.recipeId, bucket);
    }
    bucket.runs += 1;
    if (job.status === 'done') bucket.done += 1;
    if (job.status === 'failed') bucket.failed += 1;
    if (job.status === 'cancelled') bucket.cancelled += 1;

    if (m) {
      bucket.runMs.push(m.runMs);
      bucket.warmKnown += 1;
      if (m.warm) {
        bucket.warm += 1;
        bucket.warmRunMs.push(m.runMs);
      } else {
        bucket.coldRunMs.push(m.runMs);
      }
      if (m.hardware.gpuUtilAvg !== null) {
        bucket.gpuUtils.push(m.hardware.gpuUtilAvg);
      }
      if (m.hardware.memUsedPeakMb !== null) {
        bucket.memPeaks.push(m.hardware.memUsedPeakMb);
      }
      const sd = swapDelta(m);
      if (sd !== null) bucket.swapDeltas.push(sd);
    }
  }

  const finished = counts.done + counts.failed + counts.cancelled;
  const queueSorted = [...queueWaits].sort((a, b) => a - b);

  const recipes = [...recipeBuckets.entries()]
    .map(([recipeId, b]) => {
      const runSorted = [...b.runMs].sort((a, b2) => a - b2);
      const ended = b.done + b.failed + b.cancelled;
      return {
        recipeId,
        runs: b.runs,
        done: b.done,
        failed: b.failed,
        cancelled: b.cancelled,
        successRate: ended > 0 ? b.done / ended : null,
        runMsP50: percentile(runSorted, 50),
        runMsP95: percentile(runSorted, 95),
        warmRate: b.warmKnown > 0 ? b.warm / b.warmKnown : null,
        coldMedianRunMs: median(b.coldRunMs),
        warmMedianRunMs: median(b.warmRunMs),
        gpuUtilAvg:
          b.gpuUtils.length > 0
            ? b.gpuUtils.reduce((a, c) => a + c, 0) / b.gpuUtils.length
            : null,
        memUsedPeakMax: b.memPeaks.length > 0 ? Math.max(...b.memPeaks) : null,
        swapDeltaMax:
          b.swapDeltas.length > 0 ? Math.max(...b.swapDeltas) : null,
      };
    })
    .sort((a, b) => b.runs - a.runs);

  const topErrors = [...errorCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topUsers = [...userRuns.entries()]
    .map(([userId, runs]) => {
      const u = byUser.get(userId);
      return {
        userId,
        fullName: u?.fullName ?? 'Unknown',
        email: u?.email ?? 'unknown@local',
        runs,
      };
    })
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 5);

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    truncated,
    counts,
    successRate: finished > 0 ? counts.done / finished : null,
    queueWaitP50: percentile(queueSorted, 50),
    queueWaitP95: percentile(queueSorted, 95),
    recipes,
    topErrors,
    topUsers,
  };
}
