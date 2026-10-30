import type { JobMetricsRow } from '../schema.js';

export type ListMetricsOpts = {
  limit: number;
  before?: Date;
};

export type MetricsStore = {
  save(row: JobMetricsRow): Promise<void>;
  findByJobId(id: string): Promise<JobMetricsRow | null>;
  list(opts: ListMetricsOpts): Promise<JobMetricsRow[]>;
};
