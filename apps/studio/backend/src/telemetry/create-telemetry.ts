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
import { buildSnapshot } from './snapshot.js';
import type { HardwareSample, RunEnd, RunEvent, RunMeta, Telemetry } from './types.js';

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
    snapshot: () => null,
    watch: () => () => undefined,
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
  const watchers = new Set<(sample: HardwareSample) => void>();
  let watchTimer: ReturnType<typeof setInterval> | null = null;

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

  const tickWatchers = (): void => {
    let sample: HardwareSample;
    try {
      sample = sampler.read();
    } catch (err) {
      logger.warn({ err }, 'telemetry watch sampler.read failed');
      return;
    }
    for (const listener of watchers) {
      try {
        listener(sample);
      } catch {
        // Never let a bad watcher stop the loop.
      }
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

    snapshot(jobId: string) {
      try {
        const state = runs.get(jobId);
        if (!state || state.ended) return null;
        return buildSnapshot(state, clock.now());
      } catch (err) {
        logger.warn({ err, jobId }, 'telemetry snapshot failed');
        return null;
      }
    },

    watch(listener, intervalMs = 1000) {
      watchers.add(listener);
      try {
        sampler.acquire();
      } catch (err) {
        logger.warn({ err }, 'telemetry watch acquire failed');
      }
      if (watchTimer === null) {
        watchTimer = setInterval(tickWatchers, intervalMs);
        watchTimer.unref?.();
        tickWatchers();
      }
      let stopped = false;
      return () => {
        if (stopped) return;
        stopped = true;
        watchers.delete(listener);
        try {
          sampler.release();
        } catch (err) {
          logger.warn({ err }, 'telemetry watch release failed');
        }
        if (watchers.size === 0 && watchTimer !== null) {
          clearInterval(watchTimer);
          watchTimer = null;
        }
      };
    },

    async flush(): Promise<void> {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      if (watchTimer !== null) {
        clearInterval(watchTimer);
        watchTimer = null;
      }
      watchers.clear();
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
