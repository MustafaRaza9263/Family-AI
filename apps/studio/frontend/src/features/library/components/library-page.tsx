'use client';

import type { AssetDto } from '@studio/shared';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { LibraryPane } from './library-pane';

function toastApiError(err: unknown): void {
  const code = err instanceof ApiError ? err.code : undefined;
  toast.error(errorMessage(code));
}

const tabTriggerClass =
  'rounded-full px-4 py-2 text-[15px] font-medium shadow-none ' +
  'text-muted-foreground hover:text-foreground ' +
  'data-[state=active]:bg-surface-muted data-[state=active]:text-foreground ' +
  'data-[state=active]:shadow-none';

const filterChipClass =
  'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[15px] font-medium ' +
  'transition-colors duration-150';

export function LibraryPage() {
  const router = useRouter();
  const caps = useCapabilities();
  const createThread = useCreateThread();
  const createGen = useCreateGeneration();
  const [selected, setSelected] = useState<AssetDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [favoritedOnly, setFavoritedOnly] = useState(false);

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
      const created = await createThread.mutateAsync({ tool: 'image' });
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
    favoritedOnly,
    selected,
    selectedIds,
    maxSelect,
    onToggleSelect: toggleSelect,
  };

  const showComposer = selected.length > 0 && Boolean(imageTool);

  return (
    <div
      className={cn(
        'flex h-full min-h-full w-full min-w-0 flex-col',
        // Room so the last tiles clear the fixed composer (+ mobile tab bar).
        showComposer &&
          'pb-[calc(12rem+var(--safe-bottom))] md:pb-[calc(11rem+var(--safe-bottom))]',
      )}
    >
      <h1 className="shrink-0 text-3xl font-semibold tracking-tight text-foreground">
        Library
      </h1>
      <Tabs
        defaultValue="all"
        className="mt-5 flex min-h-0 flex-1 flex-col"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <TabsList className="h-auto gap-1 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="all" className={tabTriggerClass}>
              All
            </TabsTrigger>
            <TabsTrigger value="image" className={tabTriggerClass}>
              Images
            </TabsTrigger>
            <TabsTrigger value="video" className={tabTriggerClass}>
              Videos
            </TabsTrigger>
          </TabsList>
          <button
            type="button"
            aria-pressed={favoritedOnly}
            onClick={() => setFavoritedOnly((v) => !v)}
            className={cn(
              filterChipClass,
              favoritedOnly
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
            )}
          >
            <Heart
              className={cn('size-3.5', favoritedOnly && 'fill-current')}
              strokeWidth={2}
            />
            Favorites
          </button>
        </div>
        <TabsContent
          value="all"
          className="relative mt-5 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <LibraryPane kind={undefined} {...paneProps} />
        </TabsContent>
        <TabsContent
          value="image"
          className="relative mt-5 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <LibraryPane kind="image" {...paneProps} />
        </TabsContent>
        <TabsContent
          value="video"
          className="relative mt-5 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <LibraryPane kind="video" {...paneProps} />
        </TabsContent>
      </Tabs>

      {showComposer && imageTool ? (
        <div
          className={cn(
            'fixed inset-x-0 z-30 px-4 md:left-60 md:px-8',
            // Sit above the mobile tab bar; flush to bottom on desktop.
            'bottom-[calc(3.75rem+var(--safe-bottom))] md:bottom-0',
            'pt-4 pb-[max(0.75rem,var(--safe-bottom))] md:pb-4',
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
