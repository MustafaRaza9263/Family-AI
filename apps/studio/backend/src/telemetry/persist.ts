import type { Logger } from '../lib/logger.js';
import { jobMetricsRowSchema, type JobMetricsRow } from './schema.js';
import type { MetricsStore } from './store/types.js';

/** Fire-and-forget save with validation; tracks in-flight promises for flush(). */
export function createPersister(store: MetricsStore, logger: Logger) {
  const pending = new Set<Promise<void>>();

  return {
    save(row: JobMetricsRow): void {
      const parsed = jobMetricsRowSchema.safeParse(row);
      if (!parsed.success) {
        logger.warn(
          { issues: parsed.error.issues },
          'telemetry row failed validation; not saved',
        );
        return;
      }
      const task = store.save(parsed.data).catch((err: unknown) => {
        logger.warn(
          { err, jobId: parsed.data.jobId },
          'telemetry store.save failed',
        );
      });
      pending.add(task);
      void task.finally(() => {
        pending.delete(task);
      });
    },

    async flush(): Promise<void> {
      await Promise.allSettled([...pending]);
    },
  };
}
