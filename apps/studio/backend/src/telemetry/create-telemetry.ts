import type { Clock } from '../lib/clock.js';
import { systemClock } from '../lib/clock.js';
import {
  defaultTelemetryConfig,
  type TelemetryConfig,
} from './config.js';
import { createPersister } from './persist.js';
import type { HardwareSampler } from './sampler/types.js';
import type { MetricsStore } from './store/types.js';
import type { Logger } from '../lib/logger.js';
import {
  buildRow,
  createRunState,
  trackEvent,
  trackSample,
  type RunState,
} from './run-tracker.js';
import type { RunEnd, RunEvent, RunMeta, Telemetry } from './types.js';

export type CreateTelemetryDeps = {
  store: MetricsStore;
  sampler: HardwareSampler;
  logger: Logger;
  clock?: Clock;
  config?: TelemetryConfig;
};

function noopTelemetry(): Telemetry {
  return {
    runStart: () => undefined,
    runEvent: () => undefined,
    runEnd: () => undefined,
    flush: async () => undefined,
  };
}

export function createTelemetry(deps: CreateTelemetryDeps): Telemetry {
  const config: TelemetryConfig = deps.config ?? defaultTelemetryConfig;
  if (!config.enabled) {
    return noopTelemetry();
  }

  const { store, sampler, logger } = deps;
  const clock: Clock = deps.clock ?? systemClock;
  const runs = new Map<string, RunState>();
  const persister = createPersister(store, logger);
  let timer: ReturnType<typeof setInterval> | null = null;

  const sampleActive = (): void => {
    let sample;
    try {
      sample = sampler.read();
    } catch (err) {
      logger.warn({ err }, 'telemetry sampler.read failed');
      return;
    }
    for (const state of runs.values()) {
      if (!state.ended) {
        trackSample(state, sample);
      }
    }
  };

  const ensureTimer = (): void => {
    if (timer === null) {
      timer = setInterval(sampleActive, config.sampleIntervalMs);
      timer.unref?.();
    }
  };

  const stopTimerIfIdle = (): void => {
    if (runs.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    runStart(jobId: string, meta: RunMeta): void {
      try {
        if (runs.has(jobId)) {
          logger.warn({ jobId }, 'telemetry runStart for existing jobId; ignored');
          return;
        }
        runs.set(jobId, createRunState(jobId, meta, clock.now()));
        sampler.acquire();
        ensureTimer();
        sampleActive();
      } catch (err) {
        logger.warn({ err, jobId }, 'telemetry runStart failed');
      }
    },

    runEvent(jobId: string, ev: RunEvent): void {
      try {
        const state = runs.get(jobId);
        if (!state || state.ended) {
          logger.warn({ jobId }, 'telemetry runEvent for unknown job; ignored');
          return;
        }
        trackEvent(state, ev);
      } catch (err) {
        logger.warn({ err, jobId }, 'telemetry runEvent failed');
      }
    },

    runEnd(jobId: string, end: RunEnd): void {
      try {
        const state = runs.get(jobId);
        if (!state) {
          logger.warn({ jobId }, 'telemetry runEnd for unknown job; ignored');
          return;
        }
        if (state.ended) {
          return;
        }
        // Sample while still active so sub-second runs still get a final reading.
        sampleActive();
        state.ended = true;
        const row = buildRow(state, end, clock.now());
        runs.delete(jobId);
        try {
          sampler.release();
        } catch (err) {
          logger.warn({ err, jobId }, 'telemetry sampler.release failed');
        }
        stopTimerIfIdle();
        persister.save(row);
      } catch (err) {
        logger.warn({ err, jobId }, 'telemetry runEnd failed');
      }
    },

    async flush(): Promise<void> {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      for (const jobId of [...runs.keys()]) {
        runs.delete(jobId);
        try {
          sampler.release();
        } catch (err) {
          logger.warn({ err, jobId }, 'telemetry flush release failed');
        }
      }
      await persister.flush();
    },
  };
}
