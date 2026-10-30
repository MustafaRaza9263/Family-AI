import type { JobStage } from '@studio/shared';

/** Ephemeral SSE fields that are not on the job DTO. */
export type JobLiveState = {
  position?: number;
  stage?: JobStage;
  progressValue?: number;
  progressMax?: number;
};

export const jobLiveKey = (jobId: string) => ['job-live', jobId] as const;
