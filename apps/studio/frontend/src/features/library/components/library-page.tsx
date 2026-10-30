'use client';

import type { AssetDto } from '@studio/shared';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Lightbox } from '@/components/ui/lightbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { assetUrl, downloadAsset } from '@/lib/files';
import { useDeleteLibraryAsset, useLibraryInfinite } from '../hooks';
import { LibraryGrid } from './library-grid';

function LibraryPane({ kind }: { kind: AssetDto['kind'] | undefined }) {
  const query = useLibraryInfinite(kind);
  const del = useDeleteLibraryAsset();
  const [active, setActive] = useState<AssetDto | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={kind === 'video' ? 'No videos yet' : 'No generations yet'}
        description={
          kind === 'video'
            ? 'Video tools will appear here when available.'
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
        onLoadMore={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onOpen={(asset) => {
          setActive(asset);
          setLightbox(true);
        }}
      />

      {active && lightbox ? (
        <Lightbox
          src={assetUrl(active.id)}
          alt="Library item"
          onClose={() => setLightbox(false)}
        />
      ) : null}

      {active ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setLightbox(true)}>
            View
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void downloadAsset(active.id).catch(() =>
                toast.error('Download failed'),
              );
            }}
          >
            Download
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmId(active.id)}
          >
            Delete
          </Button>
        </div>
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
            setActive(null);
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

export function LibraryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="image">Images</TabsTrigger>
          <TabsTrigger value="video">Videos</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <LibraryPane kind={undefined} />
        </TabsContent>
        <TabsContent value="image">
          <LibraryPane kind="image" />
        </TabsContent>
        <TabsContent value="video">
          <LibraryPane kind="video" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
