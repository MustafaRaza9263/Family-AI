import type { AdminRun } from '@studio/shared';
import type { JobMetricsRow } from '../telemetry/schema.js';

export function toAdminRun(row: JobMetricsRow): AdminRun {
  return {
    jobId: row.jobId,
    userId: row.userId,
    recipeId: row.recipeId,
    tool: row.tool,
    status: row.status,
    errorCode: row.errorCode,
    queuedAt: row.queuedAt.toISOString(),
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt.toISOString(),
    queueWaitMs: row.queueWaitMs,
    runMs: row.runMs,
    warm: row.warm,
    phases: { ...row.phases },
  };
}
