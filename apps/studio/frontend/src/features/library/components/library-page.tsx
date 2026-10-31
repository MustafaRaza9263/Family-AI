'use client';

import type { AssetDto } from '@studio/shared';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Lightbox } from '@/components/ui/lightbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Composer,
  type ComposerSubmit,
  useCapabilities,
  useCreateGeneration,
  useCreateThread,
} from '@/features/create';
import type { AttachmentItem } from '@/features/create/attachments/types';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';
import { assetUrl } from '@/lib/files';
import { useDeleteLibraryAsset, useLibraryInfinite } from '../hooks';
import { LibraryGrid, LibraryGridSkeleton } from './library-grid';

function toastApiError(err: unknown): void {
  const code = err instanceof ApiError ? err.code : undefined;
  toast.error(errorMessage(code));
}

function LibraryPane({
  kind,
  selected,
  selectedIds,
  maxSelect,
  onToggleSelect,
}: {
  kind: AssetDto['kind'] | undefined;
  selected: AssetDto[];
  selectedIds: Set<string>;
  maxSelect: number;
  onToggleSelect: (asset: AssetDto) => void;
}) {
  const router = useRouter();
  const query = useLibraryInfinite(kind);
  const del = useDeleteLibraryAsset();
  const [lightbox, setLightbox] = useState<AssetDto | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  if (query.isLoading) {
    return <LibraryGridSkeleton />;
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
        selectedIds={selectedIds}
        onLoadMore={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onOpen={setLightbox}
        onEdit={(asset) => {
          router.push(`/create/?tool=image&base=${asset.id}`);
        }}
        onDelete={(asset) => setConfirmId(asset.id)}
        onToggleSelect={(asset) => {
          if (asset.kind !== 'image') return;
          if (
            !selectedIds.has(asset.id) &&
            selected.length >= maxSelect
          ) {
            toast.error(`You can select up to ${maxSelect} images`);
            return;
          }
          onToggleSelect(asset);
        }}
      />

      {lightbox ? (
        <Lightbox
          src={assetUrl(lightbox.id)}
          alt="Library item"
          onClose={() => setLightbox(null)}
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

const tabTriggerClass =
  'rounded-full px-4 py-2 text-[15px] font-medium shadow-none ' +
  'text-muted-foreground hover:text-foreground ' +
  'data-[state=active]:bg-surface-muted data-[state=active]:text-foreground ' +
  'data-[state=active]:shadow-none';

export function LibraryPage() {
  const router = useRouter();
  const caps = useCapabilities();
  const createThread = useCreateThread();
  const createGen = useCreateGeneration();
  const [selected, setSelected] = useState<AssetDto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selected.map((a) => a.id)),
    [selected],
  );

  const imageTool = caps.data?.tools.find((t) => t.id === 'image');
  const maxSelect = imageTool?.attachments.max ?? 4;
  const quota = caps.data?.limits.image ?? { dailyRuns: 0, remaining: 0 };

  const toggleSelect = (asset: AssetDto) => {
    setSelected((prev) => {
      if (prev.some((a) => a.id === asset.id)) {
        return prev.filter((a) => a.id !== asset.id);
      }
      if (prev.length >= maxSelect) return prev;
      return [...prev, asset];
    });
  };

  const clearSelection = () => setSelected([]);

  const seedAttachments: AttachmentItem[] = selected.map((asset) => ({
    key: `lib-${asset.id}`,
    assetId: asset.id,
    previewUrl: assetUrl(asset.id, { thumb: true }),
    uploading: false,
  }));

  const onSubmit = async (data: ComposerSubmit) => {
    if (!imageTool) return;
    setSubmitting(true);
    try {
      const created = await createThread.mutateAsync(undefined);
      const threadId = created.thread.id;
      await createGen.mutateAsync({
        threadId,
        input: {
          tool: 'image',
          prompt: data.prompt,
          values: data.values,
          variant: data.variant,
          inputAssetIds: data.inputAssetIds,
        },
      });
      clearSelection();
      router.push(`/create/?tool=image&thread=${threadId}`);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const paneProps = {
    selected,
    selectedIds,
    maxSelect,
    onToggleSelect: toggleSelect,
  };

  return (
    <div
      className={cn(
        'flex min-h-full w-full min-w-0 flex-col',
        selected.length > 0 && 'pb-2',
      )}
    >
      <div className="min-w-0 flex-1 space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Library
        </h1>
        <Tabs defaultValue="image">
          <TabsList className="h-auto gap-1 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="image" className={tabTriggerClass}>
              Images
            </TabsTrigger>
            <TabsTrigger value="video" className={tabTriggerClass}>
              Videos
            </TabsTrigger>
            <TabsTrigger value="all" className={tabTriggerClass}>
              All
            </TabsTrigger>
          </TabsList>
          <TabsContent value="image" className="mt-5">
            <LibraryPane kind="image" {...paneProps} />
          </TabsContent>
          <TabsContent value="video" className="mt-5">
            <LibraryPane kind="video" {...paneProps} />
          </TabsContent>
          <TabsContent value="all" className="mt-5">
            <LibraryPane kind={undefined} {...paneProps} />
          </TabsContent>
        </Tabs>
      </div>

      {selected.length > 0 && imageTool ? (
        <div
          className={cn(
            'sticky bottom-0 z-20 mt-4 min-w-0 pt-3',
            'pb-[max(0.5rem,var(--safe-bottom))]',
          )}
        >
          <div className="mx-auto w-full min-w-0 max-w-4xl">
            <Composer
              key={seedAttachments.map((a) => a.key).join('|')}
              tool={imageTool}
              engineState={caps.data?.engine.state ?? 'unavailable'}
              quota={quota}
              submitting={submitting}
              initialAttachments={seedAttachments}
              onSubmit={onSubmit}
              onAttachmentRemove={(key) => {
                const id = key.startsWith('lib-') ? key.slice(4) : key;
                setSelected((prev) => prev.filter((a) => a.id !== id));
              }}
              onAttachmentsClear={clearSelection}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
