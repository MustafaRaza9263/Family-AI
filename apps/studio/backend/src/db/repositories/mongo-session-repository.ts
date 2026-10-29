import { ObjectId, type Collection, type Db } from 'mongodb';
import type { SessionDocument } from '../documents.js';
import type {
  CreateSessionInput,
  SessionRecord,
  SessionRepository,
} from './session-repository.js';

function toRecord(doc: SessionDocument): SessionRecord {
  return {
    id: doc._id.toHexString(),
    tokenHash: doc.tokenHash,
    userId: doc.userId.toHexString(),
    createdAt: doc.createdAt,
    lastSeenAt: doc.lastSeenAt,
    expiresAt: doc.expiresAt,
  };
}

export class MongoSessionRepository implements SessionRepository {
  private readonly sessions: Collection<SessionDocument>;

  constructor(db: Db) {
    this.sessions = db.collection<SessionDocument>('sessions');
  }

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const _id = new ObjectId();
    const doc: SessionDocument = {
      _id,
      tokenHash: input.tokenHash,
      userId: new ObjectId(input.userId),
      createdAt: input.createdAt,
      lastSeenAt: input.lastSeenAt,
      expiresAt: input.expiresAt,
    };
    await this.sessions.insertOne(doc);
    return toRecord(doc);
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const doc = await this.sessions.findOne({ tokenHash });
    return doc ? toRecord(doc) : null;
  }

  async touch(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void> {
    if (!ObjectId.isValid(id)) {
      return;
    }
    await this.sessions.updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastSeenAt, expiresAt } },
    );
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.sessions.deleteOne({ tokenHash });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    if (!ObjectId.isValid(userId)) {
      return;
    }
    await this.sessions.deleteMany({ userId: new ObjectId(userId) });
  }
}
