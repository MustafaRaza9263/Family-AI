import { randomUUID } from 'node:crypto';
import type {
  AssetRecord,
  AssetRepository,
  CreateAssetInput,
  ListLibraryOpts,
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

  async findByIds(ids: string[]): Promise<AssetRecord[]> {
    return ids
      .map((id) => this.assets.get(id))
      .filter((a): a is AssetRecord => !!a && !a.deletedAt)
      .map((a) => ({ ...a }));
  }

  async listByThread(threadId: string): Promise<AssetRecord[]> {
    return [...this.assets.values()]
      .filter((a) => a.threadId === threadId && !a.deletedAt)
      .map((a) => ({ ...a }));
  }

  async listLibrary(opts: ListLibraryOpts): Promise<AssetRecord[]> {
    let rows = [...this.assets.values()].filter(
      (a) => a.userId === opts.userId && !a.deletedAt,
    );
    if (opts.kind) rows = rows.filter((a) => a.kind === opts.kind);
    if (opts.source) rows = rows.filter((a) => a.source === opts.source);
    rows.sort((a, b) => {
      const dt = b.createdAt.getTime() - a.createdAt.getTime();
      if (dt !== 0) return dt;
      return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
    });
    const before = opts.before;
    if (before) {
      rows = rows.filter((a) => {
        const ct = a.createdAt.getTime();
        const bt = before.createdAt.getTime();
        return ct < bt || (ct === bt && a.id < before.id);
      });
    }
    return rows.slice(0, opts.limit).map((a) => ({ ...a }));
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
