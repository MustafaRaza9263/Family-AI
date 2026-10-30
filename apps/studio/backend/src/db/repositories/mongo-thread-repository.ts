import { ObjectId, type Collection, type Db } from 'mongodb';
import type { ThreadDocument } from '../documents.js';
import type {
  CreateThreadInput,
  ThreadRecord,
  ThreadRepository,
} from './thread-repository.js';

function toRecord(doc: ThreadDocument): ThreadRecord {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    deletedAt: doc.deletedAt,
  };
}

export class MongoThreadRepository implements ThreadRepository {
  private readonly threads: Collection<ThreadDocument>;

  constructor(db: Db) {
    this.threads = db.collection<ThreadDocument>('threads');
  }

  async create(input: CreateThreadInput): Promise<ThreadRecord> {
    const doc: ThreadDocument = {
      _id: new ObjectId(),
      userId: new ObjectId(input.userId),
      title: input.title,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
    await this.threads.insertOne(doc);
    return toRecord(doc);
  }

  async findById(id: string): Promise<ThreadRecord | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.threads.findOne({
      _id: new ObjectId(id),
      deletedAt: { $exists: false },
    });
    return doc ? toRecord(doc) : null;
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<ThreadRecord | null> {
    if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) return null;
    const doc = await this.threads.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
      deletedAt: { $exists: false },
    });
    return doc ? toRecord(doc) : null;
  }

  async touchUpdatedAt(id: string, at: Date): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    await this.threads.updateOne(
      { _id: new ObjectId(id) },
      { $set: { updatedAt: at } },
    );
  }

  async softDelete(id: string, at: Date): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    await this.threads.updateOne(
      { _id: new ObjectId(id) },
      { $set: { deletedAt: at, updatedAt: at } },
    );
  }
}
