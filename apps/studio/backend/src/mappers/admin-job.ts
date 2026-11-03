import type {
  AdminJobDetail,
  AdminJobMetrics,
  AdminJobRow,
  AdminLiveSnapshot,
} from '@studio/shared';
import type { AssetRecord } from '../db/repositories/asset-repository.js';
import type { JobRecord } from '../db/repositories/job-repository.js';
import type { UserRecord } from '../db/repositories/user-repository.js';
import { toAssetDto } from './asset.js';
import type { JobMetricsRow } from '../telemetry/schema.js';
import type { RunSnapshot } from '../telemetry/types.js';

function swapDeltaMb(row: JobMetricsRow): number | null {
  const start = row.hardware.swapUsedStartMb;
  const peak = row.hardware.swapUsedPeakMb;
  if (start === null || peak === null) return null;
  return peak - start;
}

function waitMs(job: JobRecord, metrics: JobMetricsRow | null): number | undefined {
  if (metrics) return metrics.queueWaitMs;
  if (!job.timings.startedAt) return undefined;
  return Math.max(
    0,
    job.timings.startedAt.getTime() - job.timings.queuedAt.getTime(),
  );
}

function runMs(job: JobRecord, metrics: JobMetricsRow | null): number | undefined {
  if (metrics) return metrics.runMs;
  if (!job.timings.startedAt || !job.timings.finishedAt) return undefined;
  return Math.max(
    0,
    job.timings.finishedAt.getTime() - job.timings.startedAt.getTime(),
  );
}

function cleanOutput(
  output: JobMetricsRow['output'],
): AdminJobMetrics['output'] {
  if (!output) return undefined;
  // Image runs store frames:null in Mongo; Zod optional rejects null.
  const cleaned: NonNullable<AdminJobMetrics['output']> = {};
  if (output.width != null) cleaned.width = output.width;
  if (output.height != null) cleaned.height = output.height;
  if (output.frames != null) cleaned.frames = output.frames;
  if (output.bytes != null) cleaned.bytes = output.bytes;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function toAdminJobMetrics(row: JobMetricsRow): AdminJobMetrics {
  return {
    jobId: row.jobId,
    userId: row.userId,
    recipeId: row.recipeId,
    tool: row.tool,
    status: row.status,
    errorCode: row.errorCode ?? undefined,
    queuedAt: row.queuedAt.toISOString(),
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt.toISOString(),
    queueWaitMs: row.queueWaitMs,
    runMs: row.runMs,
    output: cleanOutput(row.output),
    nodes: row.nodes.map((n) => ({
      nodeId: n.nodeId,
      class: n.class,
      title: n.title ?? undefined,
      ms: n.ms,
      cached: n.cached,
    })),
    phases: { ...row.phases },
    hardware: { ...row.hardware },
    warm: row.warm,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAdminLiveSnapshot(snap: RunSnapshot): AdminLiveSnapshot {
  return {
    jobId: snap.jobId,
    nodes: snap.nodes.map((n) => ({ ...n })),
    phases: { ...snap.phases },
    hardware: { ...snap.hardware },
    elapsedMs: snap.elapsedMs,
  };
}

export function toAdminJobRow(
  job: JobRecord,
  user: UserRecord | undefined,
  outputs: AssetRecord[],
  metrics: JobMetricsRow | null,
): AdminJobRow {
  return {
    id: job.id,
    status: job.status,
    tool: job.tool,
    recipeId: job.recipeId,
    variant: job.variant ?? undefined,
    prompt: job.prompt,
    params: { ...job.params },
    user: {
      id: user?.id ?? job.userId,
      fullName: user?.fullName ?? 'Unknown',
      // Must be a Zod-valid email when the user row is missing.
      email: user?.email ?? 'unknown@invalid.local',
    },
    queuedAt: job.timings.queuedAt.toISOString(),
    startedAt: job.timings.startedAt?.toISOString(),
    finishedAt: job.timings.finishedAt?.toISOString(),
    queueWaitMs: waitMs(job, metrics),
    runMs: runMs(job, metrics),
    errorCode: job.errorCode ?? undefined,
    outputs: outputs.map((a) => ({
      assetId: a.id,
      kind: a.kind,
      width: a.width,
      height: a.height,
      durationSec: a.durationSec ?? undefined,
    })),
    inputAssetIds: [...job.inputAssetIds],
    metrics: metrics
      ? {
          warm: metrics.warm,
          gpuUtilPeak: metrics.hardware.gpuUtilPeak,
          memUsedPeakMb: metrics.hardware.memUsedPeakMb,
          swapDeltaMb: swapDeltaMb(metrics),
        }
      : null,
  };
}

export function toAdminJobDetail(input: {
  job: JobRecord;
  user: UserRecord | undefined;
  inputAssets: AssetRecord[];
  outputAssets: AssetRecord[];
  metrics: JobMetricsRow | null;
  metricsExpired?: boolean;
  live?: RunSnapshot | null;
}): AdminJobDetail {
  const row = toAdminJobRow(
    input.job,
    input.user,
    input.outputAssets,
    input.metrics,
  );
  const detail: AdminJobDetail = {
    ...row,
    attempts: input.job.attempts,
    errorDetail: input.job.errorDetail ?? undefined,
    parentAssetId: input.job.parentAssetId ?? undefined,
    threadId: input.job.threadId,
    inputAssets: input.inputAssets.map((a) => toAssetDto(a)),
    outputAssets: input.outputAssets.map((a) => toAssetDto(a)),
    metricsFull: input.metrics ? toAdminJobMetrics(input.metrics) : null,
  };
  if (input.metricsExpired) detail.metricsExpired = true;
  if (input.live) detail.live = toAdminLiveSnapshot(input.live);
  return detail;
}
