import type { ComfyClient } from '../comfy/index.js';
import type { JobRepository } from '../db/repositories/job-repository.js';
import type { Logger } from '../lib/logger.js';

const DEFAULT_IMAGE_RECIPE = 'image-create-fast';

export type WarmUpController = {
  /** Schedule a warm-up when idle (boot or reconnect). */
  request(): void;
  /** Abort throwaway work and wait until Comfy is free for a real job. */
  cancelIfBusy(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
};

export type CreateWarmUpOpts = {
  comfy: ComfyClient;
  jobs: JobRepository;
  logger: Logger;
  /** Returns true while the worker is running a real job. */
  isBusy: () => boolean;
};

export function createWarmUp(opts: CreateWarmUpOpts): WarmUpController {
  let pending = false;
  let running = false;
  let ac: AbortController | null = null;
  let stopped = false;
  let done: Promise<void> = Promise.resolve();

  const tryRun = (): void => {
    if (stopped || running || !pending) return;
    if (opts.isBusy()) {
      pending = false;
      return;
    }

    pending = false;
    running = true;
    ac = new AbortController();
    const signal = ac.signal;

    done = (async () => {
      try {
        const queued = await opts.jobs.listQueued();
        if (queued.length > 0 || opts.isBusy() || signal.aborted) return;
        if (!opts.comfy.recipes.has(DEFAULT_IMAGE_RECIPE)) {
          opts.logger.warn('warm-up skipped; default image recipe missing');
          return;
        }
        opts.logger.info('warm-up generation starting');
        await opts.comfy.run(DEFAULT_IMAGE_RECIPE, {
          jobId: `warmup-${Date.now()}`,
          values: { prompt: 'warm-up', aspectRatio: '1:1' },
          signal,
        });
        opts.logger.info('warm-up generation finished');
      } catch (err) {
        if (!signal.aborted) {
          opts.logger.warn({ err }, 'warm-up generation failed');
        }
      } finally {
        running = false;
        ac = null;
      }
    })();
  };

  return {
    request() {
      if (stopped) return;
      pending = true;
      tryRun();
    },
    async cancelIfBusy() {
      pending = false;
      if (running && ac) {
        ac.abort();
      }
      await done.catch(() => undefined);
    },
    stop() {
      stopped = true;
      pending = false;
      ac?.abort();
    },
    isRunning() {
      return running;
    },
  };
}
