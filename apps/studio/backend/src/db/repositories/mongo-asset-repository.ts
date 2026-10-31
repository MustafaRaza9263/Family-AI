import { ObjectId, type Collection, type Db } from 'mongodb';
import type { AssetDocument } from '../documents.js';
import type {
  AssetRecord,
  AssetRepository,
  CreateAssetInput,
  ListLibraryOpts,
} from './asset-repository.js';

function toRecord(doc: AssetDocument): AssetRecord {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    threadId: doc.threadId?.toHexString(),
    jobId: doc.jobId?.toHexString(),
    kind: doc.kind,
    filePath: doc.filePath,
    thumbPath: doc.thumbPath,
    mime: doc.mime,
    bytes: doc.bytes,
    width: doc.width,
    height: doc.height,
    durationSec: doc.durationSec,
    source: doc.source,
    parentAssetId: doc.parentAssetId?.toHexString(),
    createdAt: doc.createdAt,
    deletedAt: doc.deletedAt,
  };
}

export class MongoAssetRepository implements AssetRepository {
  private readonly assets: Collection<AssetDocument>;

  constructor(db: Db) {
    this.assets = db.collection<AssetDocument>('assets');
  }

  async create(input: CreateAssetInput): Promise<AssetRecord> {
    const doc: AssetDocument = {
      _id: new ObjectId(),
      userId: new ObjectId(input.userId),
      threadId: input.threadId ? new ObjectId(input.threadId) : undefined,
      jobId: input.jobId ? new ObjectId(input.jobId) : undefined,
      kind: input.kind,
      filePath: input.filePath,
      thumbPath: input.thumbPath,
      mime: input.mime,
      bytes: input.bytes,
      width: input.width,
      height: input.height,
      durationSec: input.durationSec,
      source: input.source,
      parentAssetId: input.parentAssetId
        ? new ObjectId(input.parentAssetId)
        : undefined,
      createdAt: input.createdAt,
    };
    await this.assets.insertOne(doc);
    return toRecord(doc);
  }

  async findById(id: string): Promise<AssetRecord | null> {
    if (!ObjectId.isValid(id)) return null;
    const doc = await this.assets.findOne({
      _id: new ObjectId(id),
      deletedAt: { $exists: false },
    });
    return doc ? toRecord(doc) : null;
  }

  async findByIds(ids: string[]): Promise<AssetRecord[]> {
    const objectIds = ids
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    if (objectIds.length === 0) return [];
    const docs = await this.assets
      .find({ _id: { $in: objectIds }, deletedAt: { $exists: false } })
      .toArray();
    return docs.map(toRecord);
  }

  async listByThread(threadId: string): Promise<AssetRecord[]> {
    if (!ObjectId.isValid(threadId)) return [];
    const docs = await this.assets
      .find({
        threadId: new ObjectId(threadId),
        deletedAt: { $exists: false },
      })
      .toArray();
    return docs.map(toRecord);
  }

  async listLibrary(opts: ListLibraryOpts): Promise<AssetRecord[]> {
    if (!ObjectId.isValid(opts.userId)) return [];
    const filter: Record<string, unknown> = {
      userId: new ObjectId(opts.userId),
      deletedAt: { $exists: false },
    };
    if (opts.kind) filter.kind = opts.kind;
    if (opts.source) filter.source = opts.source;
    if (opts.before && ObjectId.isValid(opts.before.id)) {
      filter.$or = [
        { createdAt: { $lt: opts.before.createdAt } },
        {
          createdAt: opts.before.createdAt,
          _id: { $lt: new ObjectId(opts.before.id) },
        },
      ];
    }
    const docs = await this.assets
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(opts.limit)
      .toArray();
    return docs.map(toRecord);
  }

  async updatePaths(
    id: string,
    filePath: string,
    thumbPath: string,
  ): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    await this.assets.updateOne(
      { _id: new ObjectId(id) },
      { $set: { filePath, thumbPath } },
    );
  }

  async listOlderThan(cutoff: Date): Promise<AssetRecord[]> {
    const docs = await this.assets
      .find({
        createdAt: { $lt: cutoff },
        deletedAt: { $exists: false },
      })
      .toArray();
    return docs.map(toRecord);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    await this.assets.updateOne(
      { _id: new ObjectId(id) },
      { $set: { deletedAt: at } },
    );
  }
}
