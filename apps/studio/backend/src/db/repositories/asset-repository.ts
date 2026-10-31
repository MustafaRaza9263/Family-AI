import type { AssetKind, AssetSource } from '../documents.js';

export type AssetRecord = {
  id: string;
  userId: string;
  threadId?: string;
  jobId?: string;
  kind: AssetKind;
  filePath: string;
  thumbPath: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  durationSec?: number;
  source: AssetSource;
  parentAssetId?: string;
  createdAt: Date;
  deletedAt?: Date;
};

export type CreateAssetInput = {
  userId: string;
  threadId?: string;
  jobId?: string;
  kind: AssetKind;
  filePath: string;
  thumbPath: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  durationSec?: number;
  source: AssetSource;
  parentAssetId?: string;
  createdAt: Date;
};

export type ListLibraryOpts = {
  userId: string;
  kind?: AssetKind;
  source?: AssetSource;
  limit: number;
  before?: { createdAt: Date; id: string };
};

export interface AssetRepository {
  create(input: CreateAssetInput): Promise<AssetRecord>;
  findById(id: string): Promise<AssetRecord | null>;
  findByIds(ids: string[]): Promise<AssetRecord[]>;
  listByThread(threadId: string): Promise<AssetRecord[]>;
  listLibrary(opts: ListLibraryOpts): Promise<AssetRecord[]>;
  updatePaths(
    id: string,
    filePath: string,
    thumbPath: string,
  ): Promise<void>;
  listOlderThan(cutoff: Date): Promise<AssetRecord[]>;
  softDelete(id: string, at: Date): Promise<void>;
}
