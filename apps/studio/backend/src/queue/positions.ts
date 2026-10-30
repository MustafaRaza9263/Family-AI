import type { EventHub } from '../events/hub.js';
import type { JobRepository } from '../db/repositories/job-repository.js';
import { orderQueue } from './scheduler.js';

/** Recompute 1-based positions and notify each job's owner. */
export async function publishQueuePositions(
  jobs: JobRepository,
  hub: EventHub,
  lastServedAt: ReadonlyMap<string, number>,
): Promise<void> {
  const queued = await jobs.listQueued();
  const ordered = orderQueue(queued, lastServedAt);
  for (let i = 0; i < ordered.length; i++) {
    const job = ordered[i];
    if (!job) continue;
    hub.publish(job.userId, {
      type: 'job.position',
      jobId: job.id,
      position: i + 1,
    });
  }
}
