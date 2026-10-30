import type { AdminJob, UserJob } from '@studio/shared';
import type { JobRecord } from '../db/repositories/job-repository.js';

function timings(job: JobRecord): UserJob['timings'] {
  return {
    queuedAt: job.timings.queuedAt.toISOString(),
    startedAt: job.timings.startedAt?.toISOString(),
    finishedAt: job.timings.finishedAt?.toISOString(),
  };
}

/** Strip engine identifiers before they leave the API. */
export function toUserJob(job: JobRecord): UserJob {
  return {
    id: job.id,
    threadId: job.threadId,
    tool: job.tool,
    // Coerce null → omit; Zod optional rejects JSON null from Mongo.
    variant: job.variant ?? undefined,
    status: job.status,
    prompt: job.prompt,
    params: { ...job.params },
    inputAssetIds: [...job.inputAssetIds],
    outputAssetIds: [...job.outputAssetIds],
    parentAssetId: job.parentAssetId ?? undefined,
    errorCode: job.errorCode ?? undefined,
    timings: timings(job),
  };
}

export function toAdminJob(job: JobRecord): AdminJob {
  return {
    ...toUserJob(job),
    userId: job.userId,
    recipeId: job.recipeId,
    attempts: job.attempts,
  };
}
