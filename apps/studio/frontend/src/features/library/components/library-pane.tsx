'use client';

import type { AssetDto } from '@studio/shared';
import { Heart, ImageIcon, Images, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Lightbox } from '@/components/ui/lightbox';
import { VideoLightbox } from '@/components/ui/video-lightbox';
import { useMe } from '@/features/auth/hooks';
import { useExtractFrame } from '@/features/create';
import { continueFromLastFrame } from '@/features/create/continue-from-video';
import { formatDurationBadge } from '@/features/create/format-duration';
import { ApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';
import { assetUrl } from '@/lib/files';
import {
  useDeleteLibraryAsset,
  useLibraryInfinite,
  useToggleFavorite,
} from '../hooks';
import { LibraryGrid, LibraryGridSkeleton } from './library-grid';

function toastApiError(err: unknown): void {
  const code = err instanceof ApiError ? err.code : undefined;
  toast.error(errorMessage(code));
}

export function LibraryPane({
  kind,
  favoritedOnly,
  selected,
  selectedIds,
  maxSelect,
  onToggleSelect,
}: {
  kind: AssetDto['kind'] | undefined;
  favoritedOnly: boolean;
  selected: AssetDto[];
  selectedIds: Set<string>;
  maxSelect: number;
  onToggleSelect: (asset: AssetDto) => void;
}) {
  const router = useRouter();
  const me = useMe();
  const query = useLibraryInfinite(kind, favoritedOnly);
  const del = useDeleteLibraryAsset();
  const favorite = useToggleFavorite();
  const extractFrame = useExtractFrame();
  const [lightbox, setLightbox] = useState<AssetDto | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const viewerUserId = me.data?.user.id;

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const lightboxIndex = lightbox
    ? items.findIndex((a) => a.id === lightbox.id)
    : -1;

  const startFromVideo = (asset: AssetDto) => {
    void continueFromLastFrame(asset.id, (id, at) =>
      extractFrame.mutateAsync({ assetId: id, at }),
    )
      .then((item) => {
        router.push(`/create/?tool=video&base=${item.assetId}`);
      })
      .catch(toastApiError);
  };

  if (query.isLoading) {
    return <LibraryGridSkeleton />;
  }

  if (items.length === 0) {
    const icon = favoritedOnly ? (
      <Heart strokeWidth={1.5} />
    ) : kind === 'video' ? (
      <Video strokeWidth={1.5} />
    ) : kind === 'image' ? (
      <ImageIcon strokeWidth={1.5} />
    ) : (
      <Images strokeWidth={1.5} />
    );
    // In-flow + min-height: absolute inset-0 collapses on mobile when the
    // tab pane has no resolved height, so the icon overlaps the filter chips.
    return (
      <EmptyState
        className="min-h-[min(24rem,55dvh)] w-full"
        icon={icon}
        title={
          favoritedOnly
            ? 'No favorites yet'
            : kind === 'video'
              ? 'No videos yet'
              : 'No generations yet'
        }
        description={
          favoritedOnly
            ? 'Tap the heart on any image or video to save it here.'
            : kind === 'video'
              ? 'Create a video and it will show up here.'
              : 'Create something and it will show up in your library.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <LibraryGrid
        items={items}
        hasMore={Boolean(query.hasNextPage)}
        loadingMore={query.isFetchingNextPage}
        selectedIds={selectedIds}
        viewerUserId={viewerUserId}
        onLoadMore={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onOpen={setLightbox}
        onEdit={(asset) => {
          router.push(`/create/?tool=image&base=${asset.id}`);
        }}
        onUseAsStart={startFromVideo}
        onDelete={(asset) => setConfirmId(asset.id)}
        onToggleFavorite={(asset) => {
          favorite.mutate(asset.id, { onError: toastApiError });
        }}
        onToggleSelect={(asset) => {
          if (asset.kind !== 'image') return;
          if (!selectedIds.has(asset.id) && selected.length >= maxSelect) {
            toast.error(`You can select up to ${maxSelect} images`);
            return;
          }
          onToggleSelect(asset);
        }}
      />

      {lightbox && lightboxIndex >= 0 && lightbox.kind === 'image' ? (
        <Lightbox
          src={assetUrl(lightbox.id)}
          alt="Library item"
          onClose={() => setLightbox(null)}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < items.length - 1}
          onPrev={() => setLightbox(items[lightboxIndex - 1] ?? null)}
          onNext={() => setLightbox(items[lightboxIndex + 1] ?? null)}
        />
      ) : null}

      {lightbox && lightboxIndex >= 0 && lightbox.kind === 'video' ? (
        <VideoLightbox
          assetId={lightbox.id}
          posterUrl={assetUrl(lightbox.id, { thumb: true })}
          durationLabel={formatDurationBadge(lightbox.durationSec)}
          onClose={() => setLightbox(null)}
          onDelete={() => setConfirmId(lightbox.id)}
          onUseAsStart={() => startFromVideo(lightbox)}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < items.length - 1}
          onPrev={() => setLightbox(items[lightboxIndex - 1] ?? null)}
          onNext={() => setLightbox(items[lightboxIndex + 1] ?? null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this file?"
        description="This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmId) {
            del.mutate(confirmId);
            setLightbox((cur) => (cur?.id === confirmId ? null : cur));
          }
          setConfirmId(null);
        }}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      />
    </div>
  );
}
