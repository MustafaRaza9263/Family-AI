import type { Collection } from 'mongodb';
import type { JobMetricsRow } from '../schema.js';
import type { ListMetricsOpts, MetricsStore } from './types.js';

const SECONDS_PER_DAY = 24 * 60 * 60;

/** Mongo-backed metrics store. Indexes are created only via ensureIndexes(). */
export class MongoMetricsStore implements MetricsStore {
  private readonly collection: Collection<JobMetricsRow>;
  private readonly retentionDays: number;

  constructor(collection: Collection<JobMetricsRow>, retentionDays: number) {
    this.collection = collection;
    this.retentionDays = retentionDays;
  }

  async ensureIndexes(): Promise<void> {
    await this.collection.createIndexes([
      { key: { jobId: 1 }, unique: true, name: 'job_metrics_jobId_unique' },
      { key: { finishedAt: -1 }, name: 'job_metrics_finishedAt' },
      {
        key: { recipeId: 1, finishedAt: -1 },
        name: 'job_metrics_recipeId_finishedAt',
      },
      {
        key: { createdAt: 1 },
        expireAfterSeconds: this.retentionDays * SECONDS_PER_DAY,
        name: 'job_metrics_createdAt_ttl',
      },
    ]);
  }

  async save(row: JobMetricsRow): Promise<void> {
    await this.collection.replaceOne({ jobId: row.jobId }, row, { upsert: true });
  }

  async findByJobId(id: string): Promise<JobMetricsRow | null> {
    const doc = await this.collection.findOne(
      { jobId: id },
      { projection: { _id: 0 } },
    );
    return doc ? stripId(doc) : null;
  }

  async list(opts: ListMetricsOpts): Promise<JobMetricsRow[]> {
    const filter = opts.before ? { finishedAt: { $lt: opts.before } } : {};
    const docs = await this.collection
      .find(filter, { projection: { _id: 0 } })
      .sort({ finishedAt: -1 })
      .limit(opts.limit)
      .toArray();
    return docs.map(stripId);
  }
}

function stripId(doc: JobMetricsRow & { _id?: unknown }): JobMetricsRow {
  if (!('_id' in doc)) {
    return doc;
  }
  const row = { ...doc };
  delete row._id;
  return row;
}
