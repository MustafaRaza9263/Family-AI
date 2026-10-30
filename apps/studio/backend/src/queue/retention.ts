import { unlink } from 'node:fs/promises';
import type { Clock } from '../lib/clock.js';
import type { Logger } from '../lib/logger.js';
import type { AssetRepository } from '../db/repositories/asset-repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionController = {
  start(): void;
  stop(): void;
  /** Exposed for tests. */
  runOnce(): Promise<void>;
};

export function createRetention(opts: {
  assets: AssetRepository;
  clock: Clock;
  logger: Logger;
  retentionDays: number;
}): RetentionController {
  let timer: ReturnType<typeof setInterval> | null = null;

  const runOnce = async (): Promise<void> => {
    const cutoff = new Date(
      opts.clock.now().getTime() - opts.retentionDays * DAY_MS,
    );
    const old = await opts.assets.listOlderThan(cutoff);
    for (const asset of old) {
      try {
        await unlink(asset.filePath).catch(() => undefined);
        await unlink(asset.thumbPath).catch(() => undefined);
        await opts.assets.softDelete(asset.id, opts.clock.now());
      } catch (err) {
        opts.logger.warn({ err, assetId: asset.id }, 'retention failed');
      }
    }
  };

  return {
    start() {
      if (timer) return;
      void runOnce();
      timer = setInterval(() => {
        void runOnce();
      }, DAY_MS);
      timer.unref?.();
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    runOnce,
  };
}
