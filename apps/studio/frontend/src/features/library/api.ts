import {
  favoriteToggleResponseSchema,
  libraryPageSchema,
  type AssetDto,
} from '@studio/shared';
import { z } from 'zod';
import { apiFetch } from '@/lib/api-client';

export function listLibrary(opts: {
  kind?: AssetDto['kind'];
  favorited?: boolean;
  cursor?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (opts.kind) params.set('kind', opts.kind);
  if (opts.favorited) params.set('favorited', 'true');
  if (opts.cursor) params.set('cursor', opts.cursor);
  params.set('limit', String(opts.limit ?? 24));
  return apiFetch(`/api/library?${params}`, libraryPageSchema);
}

export function deleteAsset(assetId: string) {
  return apiFetch(`/api/assets/${assetId}`, z.unknown(), { method: 'DELETE' });
}

export function toggleFavorite(assetId: string) {
  return apiFetch(
    `/api/assets/${assetId}/favorite`,
    favoriteToggleResponseSchema,
    { method: 'POST' },
  );
}
