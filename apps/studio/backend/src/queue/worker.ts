import { EventEmitter } from 'node:events';
import type { EngineState } from '@studio/shared';
import type { ComfyClient } from '../comfy/index.js';
import type { EventHub } from '../events/hub.js';
import type { Clock } from '../lib/clock.js';
import type { Logger } from '../lib/logger.js';
import type { LimitsService } from '../limits/limits.service.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';
import type { JobRepository } from '../db/repositories/job-repository.js';
import type { SettingsRepository } from '../db/repositories/settings-repository.js';
import type { Telemetry } from '../telemetry/types.js';
import { cancelJob } from './cancel.js';
import {
  createEngineMonitor,
  type EngineMonitor,
} from './engine-state.js';
import { publishQueuePositions } from './positions.js';
import { recoverRunningJobs } from './recovery.js';
import { createRetention, type RetentionController } from './retention.js';
import { runClaimedJob, type AbortMap } from './run-job.js';
import { orderQueue } from './scheduler.js';
import { createWarmUp, type WarmUpController } from './warm-up.js';

const WAKE_MS = 2_000;
const SHUTDOWN_GRACE_MS = 30_000;

export type QueueWorker = {
  start(): Promise<void>;
  wake(): void;
  cancel(jobId: string, userId: string): Promise<boolean>;
  getEngineState(): EngineState;
  setEnginePaused(paused: boolean): void;
  /** Stop claims; wait up to 30s for the running job. */
  stop(): Promise<void>;
  readonly lastServedAt: Map<string, number>;
};

export type CreateWorkerOpts = {
  comfy: ComfyClient;
  jobs: JobRepository;
  assets: AssetRepository;
  settings: SettingsRepository;
  limits: LimitsService;
  hub: EventHub;
  telemetry: Telemetry;
  clock: Clock;
  logger: Logger;
  dataDir: string;
  pingIntervalMs: number;
  retentionDays: number;
  /** Compose registers the socket-reconnect hook so warm-up can re-arm. */
  registerReconnect?: (cb: () => void) => void;
};

export function createQueueWorker(opts: CreateWorkerOpts): QueueWorker {
  const bus = new EventEmitter();
  const aborts: AbortMap = new Map();
  const lastServedAt = new Map<string, number>();
  let busy = false;
  let stopping = false;
  let wakeTimer: ReturnType<typeof setInterval> | null = null;
  let engine: EngineMonitor | null = null;
  let warmUp: WarmUpController | null = null;
  let retention: RetentionController | null = null;
  const wake = (): void => {
    bus.emit('wake');
  };

  const tick = async (): Promise<void> => {
    // Set busy before any await so overlapping wakes cannot double-claim.
    if (stopping || busy) return;
    if (!engine?.canClaim()) return;
    busy = true;
    let ran = false;

    try {
      const queued = await opts.jobs.listQueued();
      if (queued.length === 0) return;

      // Wait until throwaway warm-up has released Comfy (interrupt is shared).
      await warmUp?.cancelIfBusy();
      const ordered = orderQueue(queued, lastServedAt);
      const next = ordered[0];
      if (!next) return;

      const claimed = await opts.jobs.claim(next.id, opts.clock.now());
      if (!claimed) return;

      ran = true;
      await publishQueuePositions(opts.jobs, opts.hub, lastServedAt).catch(
        () => undefined,
      );
      await runClaimedJob(claimed, {
        comfy: opts.comfy,
        jobs: opts.jobs,
        assets: opts.assets,
        hub: opts.hub,
        telemetry: opts.telemetry,
        limits: opts.limits,
        clock: opts.clock,
        logger: opts.logger,
        dataDir: opts.dataDir,
        aborts,
        lastServedAt,
      });
    } finally {
      busy = false;
      // Only re-wake after a real run; empty polls must not spin.
      if (ran && !stopping) wake();
    }
  };

  return {
    lastServedAt,
    wake,
    async cancel(jobId, userId) {
      return cancelJob(jobId, userId, {
        jobs: opts.jobs,
        limits: opts.limits,
        hub: opts.hub,
        clock: opts.clock,
        aborts,
        lastServedAt,
      });
    },
    getEngineState() {
      return engine?.getState() ?? 'unavailable';
    },
    setEnginePaused(paused) {
      engine?.setPaused(paused);
    },
    async start() {
      engine = createEngineMonitor({
        comfy: opts.comfy,
        settings: opts.settings,
        hub: opts.hub,
        logger: opts.logger,
        pingIntervalMs: opts.pingIntervalMs,
      });
      engine.start();
      await engine.ready();

      warmUp = createWarmUp({
        comfy: opts.comfy,
        jobs: opts.jobs,
        logger: opts.logger,
        isBusy: () => busy,
      });
      opts.registerReconnect?.(() => warmUp?.request());

      retention = createRetention({
        assets: opts.assets,
        clock: opts.clock,
        logger: opts.logger,
        retentionDays: opts.retentionDays,
      });
      retention.start();

      await recoverRunningJobs({
        comfy: opts.comfy,
        jobs: opts.jobs,
        assets: opts.assets,
        limits: opts.limits,
        hub: opts.hub,
        clock: opts.clock,
        logger: opts.logger,
        dataDir: opts.dataDir,
      });

      warmUp.request();

      bus.on('wake', () => {
        void tick();
      });
      wakeTimer = setInterval(wake, WAKE_MS);
      wakeTimer.unref?.();
      wake();
    },
    async stop() {
      stopping = true;
      warmUp?.stop();
      retention?.stop();
      engine?.stop();
      if (wakeTimer) {
        clearInterval(wakeTimer);
        wakeTimer = null;
      }
      if (!busy) return;
      const deadline = Date.now() + SHUTDOWN_GRACE_MS;
      while (busy && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200));
      }
    },
  };
}
