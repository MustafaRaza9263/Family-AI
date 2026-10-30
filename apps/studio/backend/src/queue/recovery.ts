import type { ComfyClient } from '../comfy/index.js';
import { EngineError } from '../comfy/errors.js';
import type { EventHub } from '../events/hub.js';
import type { Clock } from '../lib/clock.js';
import type { Logger } from '../lib/logger.js';
import type { LimitsService } from '../limits/limits.service.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type {
  JobRecord,
  JobRepository,
} from '../db/repositories/job-repository.js';
import { writeGeneratedImage } from './write-output.js';

export type RecoveryDeps = {
  comfy: ComfyClient;
  jobs: JobRepository;
  assets: AssetRepository;
  limits: LimitsService;
  hub: EventHub;
  clock: Clock;
  logger: Logger;
  dataDir: string;
};

/**
 * Reconcile `running` jobs with ComfyUI after a Studio restart.
 * If the engine is unreachable, leave them alone.
 */
export async function recoverRunningJobs(deps: RecoveryDeps): Promise<void> {
  let queue;
  try {
    await deps.comfy.ping();
    queue = await deps.comfy.queue();
  } catch (err) {
    deps.logger.warn({ err }, 'recovery skipped; engine unreachable');
    return;
  }

  const held = new Set([...queue.running, ...queue.pending]);
  const running = await deps.jobs.listByStatus('running');

  for (const job of running) {
    try {
      await recoverOne(job, held, deps);
    } catch (err) {
      deps.logger.error({ err, jobId: job.id }, 'recovery failed for job');
    }
  }
}

async function recoverOne(
  job: JobRecord,
  held: Set<string>,
  deps: RecoveryDeps,
): Promise<void> {
  const promptId = job.comfyPromptId;
  if (promptId) {
    try {
      const collected = await deps.comfy.collect(job.recipeId, promptId);
      const image = collected.outputs[0];
      if (image) {
        const written = await writeGeneratedImage({
          dataDir: deps.dataDir,
          job,
          bytes: image,
          width: 0,
          height: 0,
          assets: deps.assets,
          createdAt: deps.clock.now(),
        });
        await deps.jobs.finish(job.id, {
          status: 'done',
          finishedAt: deps.clock.now(),
          outputAssetIds: [written.assetId],
        });
        deps.hub.publish(job.userId, {
          type: 'job.done',
          jobId: job.id,
          assetIds: [written.assetId],
        });
        return;
      }
    } catch (err) {
      if (!(err instanceof EngineError)) throw err;
    }

    if (held.has(promptId)) {
      await deps.comfy.interrupt().catch(() => undefined);
      await deps.comfy.clearPrompt(promptId).catch(() => undefined);
      await deps.jobs.requeue(job.id);
      return;
    }
  }

  if (job.attempts < 2) {
    await deps.jobs.requeue(job.id);
    return;
  }

  await deps.jobs.finish(job.id, {
    status: 'failed',
    finishedAt: deps.clock.now(),
    errorCode: 'ENGINE_FAILED',
  });
  await deps.limits.refundRun(job.userId, job.tool);
  deps.hub.publish(job.userId, {
    type: 'job.failed',
    jobId: job.id,
    errorCode: 'ENGINE_FAILED',
  });
}
