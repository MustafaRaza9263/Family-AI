import type { JobMetricsRow } from '../schema.js';
import type { ListMetricsOpts, MetricsStore } from './types.js';

/** In-memory store for unit tests and the local demo. */
export class MemoryMetricsStore implements MetricsStore {
  private readonly rows = new Map<string, JobMetricsRow>();

  async save(row: JobMetricsRow): Promise<void> {
    this.rows.set(row.jobId, row);
  }

  async findByJobId(id: string): Promise<JobMetricsRow | null> {
    return this.rows.get(id) ?? null;
  }

  async list(opts: ListMetricsOpts): Promise<JobMetricsRow[]> {
    const items = [...this.rows.values()]
      .filter((row) => (opts.before ? row.finishedAt < opts.before : true))
      .sort((a, b) => b.finishedAt.getTime() - a.finishedAt.getTime());
    return items.slice(0, opts.limit);
  }
}
