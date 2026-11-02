import type { AssetDto } from '@studio/shared';
import type { AssetRecord } from '../db/repositories/asset-repository.js';

export function toAssetDto(
  asset: AssetRecord,
  opts?: { favorited?: boolean },
): AssetDto {
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
    favorited: opts?.favorited ?? false,
    createdAt: asset.createdAt.toISOString(),
  };
}
