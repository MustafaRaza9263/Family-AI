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
    // Coerce null → omit; Zod optional rejects JSON null from Mongo.
    durationSec: asset.durationSec ?? undefined,
    source: asset.source,
    threadId: asset.threadId ?? undefined,
    jobId: asset.jobId ?? undefined,
    parentAssetId: asset.parentAssetId ?? undefined,
    createdAt: asset.createdAt.toISOString(),
  };
}
