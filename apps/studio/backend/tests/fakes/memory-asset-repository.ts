import { randomUUID } from 'node:crypto';
import type {
  AssetRecord,
  AssetRepository,
  CreateAssetInput,
} from '../../src/db/repositories/asset-repository.js';

export class MemoryAssetRepository implements AssetRepository {
  readonly assets = new Map<string, AssetRecord>();

  async create(input: CreateAssetInput): Promise<AssetRecord> {
    const record: AssetRecord = {
      id: randomUUID(),
      userId: input.userId,
      threadId: input.threadId,
      jobId: input.jobId,
      kind: input.kind,
      filePath: input.filePath,
      thumbPath: input.thumbPath,
      mime: input.mime,
      bytes: input.bytes,
      width: input.width,
      height: input.height,
      durationSec: input.durationSec,
      source: input.source,
      parentAssetId: input.parentAssetId,
      createdAt: input.createdAt,
    };
    this.assets.set(record.id, record);
    return { ...record };
  }

  async findById(id: string): Promise<AssetRecord | null> {
    const a = this.assets.get(id);
    if (!a || a.deletedAt) return null;
    return { ...a };
  }

  async updatePaths(
    id: string,
    filePath: string,
    thumbPath: string,
  ): Promise<void> {
    const a = this.assets.get(id);
    if (a) {
      a.filePath = filePath;
      a.thumbPath = thumbPath;
    }
  }

  async listOlderThan(cutoff: Date): Promise<AssetRecord[]> {
    return [...this.assets.values()]
      .filter((a) => !a.deletedAt && a.createdAt < cutoff)
      .map((a) => ({ ...a }));
  }

  async softDelete(id: string, at: Date): Promise<void> {
    const a = this.assets.get(id);
    if (a) a.deletedAt = at;
  }
}
