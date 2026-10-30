import type { AssetDto } from '@studio/shared';
import type { AssetRecord } from '../db/repositories/asset-repository.js';

export function toAssetDto(asset: AssetRecord): AssetDto {
  return {
    id: asset.id,
    kind: asset.kind,
    mime: asset.mime,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    durationSec: asset.durationSec,
    source: asset.source,
    threadId: asset.threadId,
    jobId: asset.jobId,
    parentAssetId: asset.parentAssetId,
    createdAt: asset.createdAt.toISOString(),
  };
}
