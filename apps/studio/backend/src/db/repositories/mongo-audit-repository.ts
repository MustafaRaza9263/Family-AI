import { ObjectId, type Collection, type Db } from 'mongodb';
import type {
  AuditLogRecord,
  AuditRepository,
  CreateAuditLogInput,
} from './audit-repository.js';

type AuditDocument = {
  _id: ObjectId;
  actorId: ObjectId;
  action: string;
  targetUserId?: ObjectId;
  targetAssetId?: ObjectId;
  meta?: Record<string, unknown>;
  at: Date;
};

function toRecord(doc: AuditDocument): AuditLogRecord {
  return {
    id: doc._id.toHexString(),
    actorId: doc.actorId.toHexString(),
    action: doc.action,
    targetUserId: doc.targetUserId?.toHexString(),
    targetAssetId: doc.targetAssetId?.toHexString(),
    meta: doc.meta,
    at: doc.at,
  };
}

export class MongoAuditRepository implements AuditRepository {
  private readonly logs: Collection<AuditDocument>;

  constructor(db: Db) {
    this.logs = db.collection<AuditDocument>('audit_logs');
  }

  async create(input: CreateAuditLogInput): Promise<AuditLogRecord> {
    const doc: AuditDocument = {
      _id: new ObjectId(),
      actorId: new ObjectId(input.actorId),
      action: input.action,
      targetUserId: input.targetUserId
        ? new ObjectId(input.targetUserId)
        : undefined,
      targetAssetId: input.targetAssetId
        ? new ObjectId(input.targetAssetId)
        : undefined,
      meta: input.meta,
      at: input.at,
    };
    await this.logs.insertOne(doc);
    return toRecord(doc);
  }
}
