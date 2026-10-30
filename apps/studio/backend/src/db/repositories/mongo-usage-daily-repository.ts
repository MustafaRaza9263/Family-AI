import {
  MongoServerError,
  ObjectId,
  type Collection,
  type Db,
} from 'mongodb';
import type { JobTool, UsageDailyDocument } from '../documents.js';
import type {
  UsageDailyRecord,
  UsageDailyRepository,
} from './usage-daily-repository.js';

function toRecord(doc: UsageDailyDocument): UsageDailyRecord {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    day: doc.day,
    tool: doc.tool,
    runs: doc.runs,
    gpuSeconds: doc.gpuSeconds,
  };
}

export class MongoUsageDailyRepository implements UsageDailyRepository {
  private readonly usage: Collection<UsageDailyDocument>;

  constructor(db: Db) {
    this.usage = db.collection<UsageDailyDocument>('usage_daily');
  }

  async tryIncrementRuns(
    userId: string,
    day: string,
    tool: JobTool,
    maxRuns: number,
  ): Promise<UsageDailyRecord | null> {
    if (!ObjectId.isValid(userId)) return null;
    const uid = new ObjectId(userId);

    // Only matches while under the cap. Upsert creates the first row.
    // Duplicate-key on concurrent first insert → retry without upsert.
    try {
      const doc = await this.usage.findOneAndUpdate(
        { userId: uid, day, tool, runs: { $lt: maxRuns } },
        {
          $inc: { runs: 1 },
          $setOnInsert: {
            _id: new ObjectId(),
            userId: uid,
            day,
            tool,
            gpuSeconds: 0,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
      return doc ? toRecord(doc) : null;
    } catch (err) {
      if (!(err instanceof MongoServerError) || err.code !== 11000) {
        throw err;
      }
      const doc = await this.usage.findOneAndUpdate(
        { userId: uid, day, tool, runs: { $lt: maxRuns } },
        { $inc: { runs: 1 } },
        { returnDocument: 'after' },
      );
      return doc ? toRecord(doc) : null;
    }
  }

  async refundRun(userId: string, day: string, tool: JobTool): Promise<void> {
    if (!ObjectId.isValid(userId)) return;
    await this.usage.updateOne(
      { userId: new ObjectId(userId), day, tool, runs: { $gt: 0 } },
      { $inc: { runs: -1 } },
    );
  }

  async addGpuSeconds(
    userId: string,
    day: string,
    tool: JobTool,
    seconds: number,
  ): Promise<void> {
    if (!ObjectId.isValid(userId)) return;
    await this.usage.updateOne(
      { userId: new ObjectId(userId), day, tool },
      { $inc: { gpuSeconds: seconds } },
    );
  }

  async find(
    userId: string,
    day: string,
    tool: JobTool,
  ): Promise<UsageDailyRecord | null> {
    if (!ObjectId.isValid(userId)) return null;
    const doc = await this.usage.findOne({
      userId: new ObjectId(userId),
      day,
      tool,
    });
    return doc ? toRecord(doc) : null;
  }
}
