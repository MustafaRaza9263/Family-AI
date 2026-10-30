import type { ComfyClient } from '../comfy/index.js';
import { EngineError, EngineErrorCodes } from '../comfy/errors.js';
import type { EventHub } from '../events/hub.js';
import type { Clock } from '../lib/clock.js';
import type { Logger } from '../lib/logger.js';
import type { LimitsService } from '../limits/limits.service.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type {
  JobRecord,
  JobRepository,
} from '../db/repositories/job-repository.js';
import type { Telemetry } from '../telemetry/types.js';
import { publishQueuePositions } from './positions.js';
import { stageFromNodeClass } from './stage.js';
import { writeGeneratedImage } from './write-output.js';

export type AbortMap = Map<string, AbortController>;

export type RunJobDeps = {
  comfy: ComfyClient;
  jobs: JobRepository;
  assets: AssetRepository;
  hub: EventHub;
  telemetry: Telemetry;
  limits: LimitsService;
  clock: Clock;
  logger: Logger;
  dataDir: string;
  aborts: AbortMap;
  lastServedAt: Map<string, number>;
};

export async function runClaimedJob(
  job: JobRecord,
  deps: RunJobDeps,
): Promise<void> {
  const ac = new AbortController();
  deps.aborts.set(job.id, ac);
  const startedAt = job.timings.startedAt ?? deps.clock.now();

  safeTelemetry(() =>
    deps.telemetry.runStart(job.id, {
      userId: job.userId,
      recipeId: job.recipeId,
      tool: job.tool,
      queuedAt: job.timings.queuedAt,
    }),
  );
  safePublish(deps.hub, job.userId, { type: 'job.started', jobId: job.id });

  try {
    const result = await deps.comfy.run(job.recipeId, {
      jobId: job.id,
      values: toPatchValues(job.prompt, job.params),
      signal: ac.signal,
      hooks: {
        onSubmitted(promptId) {
          void deps.jobs.setComfyPromptId(job.id, promptId);
        },
        onCached(nodes) {
          safeTelemetry(() =>
            deps.telemetry.runEvent(job.id, {
              type: 'nodes_cached',
              nodes,
              at: deps.clock.now(),
            }),
          );
        },
        onNodeStart(info) {
          safeTelemetry(() =>
            deps.telemetry.runEvent(job.id, {
              type: 'node_start',
              nodeId: info.nodeId,
              nodeClass: info.nodeClass,
              nodeTitle: info.nodeTitle,
              at: info.at,
            }),
          );
          safePublish(deps.hub, job.userId, {
            type: 'job.progress',
            jobId: job.id,
            stage: stageFromNodeClass(info.nodeClass),
          });
        },
        onProgress(info) {
          safePublish(deps.hub, job.userId, {
            type: 'job.progress',
            jobId: job.id,
            stage: 'generating',
            value: info.value,
            max: info.max,
          });
        },
      },
    });

    const image = result.outputs[0];
    if (!image) {
      throw new EngineError(
        EngineErrorCodes.ENGINE_BAD_OUTPUT,
        'Image engine produced no output',
      );
    }
    const width =
      typeof result.resolved.width === 'number' ? result.resolved.width : 0;
    const height =
      typeof result.resolved.height === 'number' ? result.resolved.height : 0;
    const written = await writeGeneratedImage({
      dataDir: deps.dataDir,
      job,
      bytes: image,
      width,
      height,
      assets: deps.assets,
      createdAt: deps.clock.now(),
    });
    const finishedAt = deps.clock.now();
    await deps.jobs.finish(job.id, {
      status: 'done',
      finishedAt,
      outputAssetIds: [written.assetId],
    });
    const runMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
    await deps.limits.addGpuSeconds(job.userId, job.tool, runMs);
    safeTelemetry(() =>
      deps.telemetry.runEnd(job.id, {
        status: 'done',
        output: {
          width: written.width,
          height: written.height,
          bytes: written.bytes,
        },
      }),
    );
    safePublish(deps.hub, job.userId, {
      type: 'job.done',
      jobId: job.id,
      assetIds: [written.assetId],
    });
    deps.lastServedAt.set(job.userId, finishedAt.getTime());
  } catch (err) {
    await failJob(job, err, deps, startedAt, ac.signal.aborted);
  } finally {
    deps.aborts.delete(job.id);
    await publishQueuePositions(deps.jobs, deps.hub, deps.lastServedAt).catch(
      () => undefined,
    );
  }
}

async function failJob(
  job: JobRecord,
  err: unknown,
  deps: RunJobDeps,
  startedAt: Date,
  aborted: boolean,
): Promise<void> {
  const code =
    err instanceof EngineError
      ? err.code
      : aborted
        ? 'ENGINE_CANCELLED'
        : 'ENGINE_FAILED';
  const status = code === 'ENGINE_CANCELLED' ? 'cancelled' : 'failed';
  const finishedAt = deps.clock.now();
  await deps.jobs.finish(job.id, {
    status,
    finishedAt,
    errorCode: code,
  });
  if (
    deps.limits.shouldRefund({
      wasQueued: false,
      status,
      errorCode: code,
    })
  ) {
    await deps.limits.refundRun(job.userId, job.tool);
  }
  const runMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());
  await deps.limits.addGpuSeconds(job.userId, job.tool, runMs).catch(() => undefined);
  safeTelemetry(() =>
    deps.telemetry.runEnd(job.id, { status, errorCode: code }),
  );
  if (status === 'cancelled') {
    safePublish(deps.hub, job.userId, {
      type: 'job.cancelled',
      jobId: job.id,
    });
  } else {
    safePublish(deps.hub, job.userId, {
      type: 'job.failed',
      jobId: job.id,
      errorCode: code,
    });
  }
  deps.logger.warn({ err, jobId: job.id, code }, 'job failed');
}

/** Comfy patchGraph accepts string values only. */
function toPatchValues(
  prompt: string,
  params: Record<string, string | number | boolean>,
): Record<string, string> {
  const values: Record<string, string> = { prompt };
  for (const [key, value] of Object.entries(params)) {
    if (key === 'prompt') continue;
    values[key] = String(value);
  }
  return values;
}

function safeTelemetry(fn: () => void): void {
  try {
    fn();
  } catch {
    // Telemetry must never break the worker loop.
  }
}

function safePublish(
  hub: EventHub,
  userId: string,
  event: Parameters<EventHub['publish']>[1],
): void {
  try {
    hub.publish(userId, event);
  } catch {
    // ignore
  }
}
