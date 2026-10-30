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

export interface AssetRepository {
  create(input: CreateAssetInput): Promise<AssetRecord>;
  findById(id: string): Promise<AssetRecord | null>;
  updatePaths(
    id: string,
    filePath: string,
    thumbPath: string,
  ): Promise<void>;
  listOlderThan(cutoff: Date): Promise<AssetRecord[]>;
  softDelete(id: string, at: Date): Promise<void>;
}
