import type { EngineState } from '@studio/shared';
import type { ComfyClient } from '../comfy/index.js';
import type { EventHub } from '../events/hub.js';
import type { Logger } from '../lib/logger.js';
import type { SettingsRepository } from '../db/repositories/settings-repository.js';

export type EngineMonitor = {
  /** ready | unavailable from ping; paused overlays from settings. */
  getState(): EngineState;
  /** True when the worker may claim (ready and not paused). */
  canClaim(): boolean;
  /** Apply admin pause immediately (settings write already happened). */
  setPaused(value: boolean): void;
  start(): void;
  /** Awaited once at boot so the first claim sees a real engine state. */
  ready(): Promise<void>;
  stop(): void;
};

export type CreateEngineMonitorOpts = {
  comfy: ComfyClient;
  settings: SettingsRepository;
  hub: EventHub;
  logger: Logger;
  pingIntervalMs: number;
};

export function createEngineMonitor(
  opts: CreateEngineMonitorOpts,
): EngineMonitor {
  let pingState: 'ready' | 'unavailable' = 'unavailable';
  let paused = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const publish = (): void => {
    const state = resolve();
    opts.hub.publishAll({ type: 'engine', state });
  };

  const resolve = (): EngineState => {
    if (paused) return 'paused';
    return pingState;
  };

  const tick = async (): Promise<void> => {
    try {
      await opts.comfy.ping();
      if (pingState !== 'ready') {
        pingState = 'ready';
        publish();
      }
    } catch (err) {
      opts.logger.warn({ err }, 'engine ping failed');
      if (pingState !== 'unavailable') {
        pingState = 'unavailable';
        publish();
      }
    }
    try {
      const settings = await opts.settings.get();
      if (settings.enginePaused !== paused) {
        paused = settings.enginePaused;
        publish();
      }
    } catch (err) {
      opts.logger.warn({ err }, 'settings read failed during engine ping');
    }
  };

  return {
    getState: resolve,
    canClaim() {
      return !paused && pingState === 'ready';
    },
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      publish();
    },
    start() {
      if (timer) return;
      timer = setInterval(() => {
        void tick();
      }, opts.pingIntervalMs);
      timer.unref?.();
    },
    async ready(): Promise<void> {
      await tick();
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
