import { ObjectId, type Collection, type Db } from 'mongodb';
import type { JobDocument } from '../documents.js';
import type {
  CreateJobInput,
  FinishJobInput,
  JobRecord,
  JobRepository,
  ListAdminJobsOpts,
  ListJobsByThreadOpts,
} from './job-repository.js';
import type { JobStatus } from '../documents.js';

function toRecord(doc: JobDocument): JobRecord {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    threadId: doc.threadId.toHexString(),
    tool: doc.tool,
    recipeId: doc.recipeId,
    variant: doc.variant,
    status: doc.status,
    prompt: doc.prompt,
    params: doc.params,
    inputAssetIds: doc.inputAssetIds.map((id) => id.toHexString()),
    outputAssetIds: doc.outputAssetIds.map((id) => id.toHexString()),
    parentAssetId: doc.parentAssetId?.toHexString(),
    comfyPromptId: doc.comfyPromptId,
    errorCode: doc.errorCode,
    attempts: doc.attempts,
    timings: {
      queuedAt: doc.timings.queuedAt,
      startedAt: doc.timings.startedAt,
      finishedAt: doc.timings.finishedAt,
    },
  };
}

export class MongoJobRepository implements JobRepository {
  private readonly jobs: Collection<JobDocument>;

  constructor(db: Db) {
    this.jobs = db.collection<JobDocument>('jobs');
  }

  async create(input: CreateJobInput): Promise<JobRecord> {
    const doc: JobDocument = {
      _id: new ObjectId(),
      userId: new ObjectId(input.userId),
      threadId: new ObjectId(input.threadId),
      tool: input.tool,
      recipeId: input.recipeId,
      variant: input.variant,
      status: 'queued',
      prompt: input.prompt,
      params: input.params,
      inputAssetIds: input.inputAssetIds.map((id) => new ObjectId(id)),
      outputAssetIds: [],
      parentAssetId: input.parentAssetId
        ? new ObjectId(input.parentAssetId)
        : undefined,
      attempts: 0,
      timings: { queuedAt: input.queuedAt },
    };
    await this.jobs.insertOne(doc);
    return toRecord(doc);
  }

  async findById(id: string): Promise<JobRecord | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.jobs.findOne({ _id: new ObjectId(id) });
    return doc ? toRecord(doc) : null;
  }

  async listQueued(): Promise<JobRecord[]> {
    const docs = await this.jobs.find({ status: 'queued' }).toArray();
    return docs.map(toRecord);
  }

  async listByStatus(status: JobStatus): Promise<JobRecord[]> {
    const docs = await this.jobs.find({ status }).toArray();
    return docs.map(toRecord);
  }

  async listByThread(opts: ListJobsByThreadOpts): Promise<JobRecord[]> {
    if (!ObjectId.isValid(opts.threadId)) return [];
    const docs = await this.jobs
      .find({ threadId: new ObjectId(opts.threadId) })
      .sort({ 'timings.queuedAt': 1, _id: 1 })
      .toArray();
    return docs.map(toRecord);
  }

  async listAdmin(opts: ListAdminJobsOpts): Promise<JobRecord[]> {
    const filter: Record<string, unknown> = {};
    if (opts.before && ObjectId.isValid(opts.before.id)) {
      filter.$or = [
        { 'timings.queuedAt': { $lt: opts.before.queuedAt } },
        {
          'timings.queuedAt': opts.before.queuedAt,
          _id: { $lt: new ObjectId(opts.before.id) },
        },
      ];
    }
    const docs = await this.jobs
      .find(filter)
      .sort({ 'timings.queuedAt': -1, _id: -1 })
      .limit(opts.limit)
      .toArray();
    return docs.map(toRecord);
  }

  async countByUserAndStatuses(
    userId: string,
    statuses: JobStatus[],
  ): Promise<number> {
    if (!ObjectId.isValid(userId)) return 0;
    return this.jobs.countDocuments({
      userId: new ObjectId(userId),
      status: { $in: statuses },
    });
  }

  async countByStatuses(statuses: JobStatus[]): Promise<number> {
    return this.jobs.countDocuments({ status: { $in: statuses } });
  }

  async claim(id: string, startedAt: Date): Promise<JobRecord | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.jobs.findOneAndUpdate(
      { _id: new ObjectId(id), status: 'queued' },
      {
        $set: { status: 'running', 'timings.startedAt': startedAt },
        $inc: { attempts: 1 },
      },
      { returnDocument: 'after' },
    );
    return doc ? toRecord(doc) : null;
  }

  async setComfyPromptId(id: string, promptId: string): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    await this.jobs.updateOne(
      { _id: new ObjectId(id) },
      { $set: { comfyPromptId: promptId } },
    );
  }

  async finish(id: string, input: FinishJobInput): Promise<JobRecord | null> {
    if (!ObjectId.isValid(id)) return null;
    const $set: Record<string, unknown> = {
      status: input.status,
      'timings.finishedAt': input.finishedAt,
    };
    if (input.outputAssetIds) {
      $set.outputAssetIds = input.outputAssetIds.map((a) => new ObjectId(a));
    }
    if (input.errorCode !== undefined) {
      $set.errorCode = input.errorCode;
    }
    const doc = await this.jobs.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set },
      { returnDocument: 'after' },
    );
    return doc ? toRecord(doc) : null;
  }

  async requeue(id: string): Promise<JobRecord | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.jobs.findOneAndUpdate(
      { _id: new ObjectId(id), status: 'running' },
      {
        $set: { status: 'queued' },
        $unset: { 'timings.startedAt': '', comfyPromptId: '', errorCode: '' },
      },
      { returnDocument: 'after' },
    );
    return doc ? toRecord(doc) : null;
  }

  async cancelQueued(
    id: string,
    userId: string,
    finishedAt: Date,
  ): Promise<JobRecord | null> {
    if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) return null;
    const doc = await this.jobs.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(userId),
        status: 'queued',
      },
      {
        $set: {
          status: 'cancelled',
          'timings.finishedAt': finishedAt,
        },
      },
      { returnDocument: 'after' },
    );
    return doc ? toRecord(doc) : null;
  }
}
