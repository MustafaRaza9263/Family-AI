import type { EngineState, JobStage } from '@studio/shared';
import type { HardwareSample, Telemetry } from '../telemetry/types.js';
import type { CurrentJobInfo } from '../queue/current-job.js';
import type { EventHub } from './hub.js';

export type AdminLiveDeps = {
  hub: EventHub;
  telemetry: Telemetry;
  getEngineState: () => EngineState;
  getQueuedCount: () => Promise<number>;
  getCurrent: () => CurrentJobInfo | null;
  resolveUserName: (userId: string) => Promise<string>;
};

const TICK_MS = 1000;

/** Starts/stops the 1 Hz admin.live loop from hub admin connection count. */
export function wireAdminLive(deps: AdminLiveDeps): () => void {
  let stopWatch: (() => void) | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastHardware: HardwareSample | null = null;
  const nameCache = new Map<string, string>();

  const tick = (): void => {
    void (async () => {
      const current = deps.getCurrent();
      let running: {
        jobId: string;
        userName: string;
        recipeId: string;
        stage: JobStage;
        startedAt: string;
      } | null = null;
      if (current) {
        let userName = nameCache.get(current.userId);
        if (!userName) {
          userName = await deps.resolveUserName(current.userId);
          nameCache.set(current.userId, userName);
        }
        running = {
          jobId: current.jobId,
          userName,
          recipeId: current.recipeId,
          stage: current.stage,
          startedAt: current.startedAt.toISOString(),
        };
      }
      const queued = await deps.getQueuedCount();
      deps.hub.publishAdmin({
        type: 'admin.live',
        engine: deps.getEngineState(),
        queued,
        running,
        hardware: lastHardware
          ? {
              at: lastHardware.at.toISOString(),
              gpuUtilPct: lastHardware.gpuUtilPct,
              powerW: lastHardware.powerW,
              tempC: lastHardware.tempC,
              memUsedMb: lastHardware.memUsedMb,
              memAvailableMb: lastHardware.memAvailableMb,
              swapUsedMb: lastHardware.swapUsedMb,
              memTotalMb: lastHardware.memTotalMb,
            }
          : null,
      });
    })().catch(() => undefined);
  };

  const start = (): void => {
    if (timer !== null) return;
    stopWatch = deps.telemetry.watch((sample) => {
      lastHardware = sample;
    }, TICK_MS);
    timer = setInterval(tick, TICK_MS);
    timer.unref?.();
    tick();
  };

  const stop = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    stopWatch?.();
    stopWatch = null;
    lastHardware = null;
  };

  return deps.hub.onAdminCountChange((count) => {
    if (count > 0) start();
    else stop();
  });
}
