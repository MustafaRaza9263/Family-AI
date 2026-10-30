import type { EventHub } from '../events/hub.js';
import type { Clock } from '../lib/clock.js';
import type { LimitsService } from '../limits/limits.service.js';
import type { JobRepository } from '../db/repositories/job-repository.js';
import { publishQueuePositions } from './positions.js';
import type { AbortMap } from './run-job.js';

export type CancelDeps = {
  jobs: JobRepository;
  limits: LimitsService;
  hub: EventHub;
  clock: Clock;
  aborts: AbortMap;
  lastServedAt: Map<string, number>;
};

export async function cancelJob(
  jobId: string,
  userId: string,
  deps: CancelDeps,
): Promise<boolean> {
  const cancelled = await deps.jobs.cancelQueued(
    jobId,
    userId,
    deps.clock.now(),
  );
  if (cancelled) {
    await deps.limits.refundRun(userId, cancelled.tool);
    deps.hub.publish(userId, { type: 'job.cancelled', jobId });
    await publishQueuePositions(deps.jobs, deps.hub, deps.lastServedAt);
    return true;
  }

  const job = await deps.jobs.findById(jobId);
  if (!job || job.userId !== userId || job.status !== 'running') {
    return false;
  }
  const ac = deps.aborts.get(jobId);
  if (ac) {
    ac.abort();
    return true;
  }
  return false;
}
