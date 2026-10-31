'use client';

import type { CapabilitiesResponse, ThreadDetailResponse } from '@studio/shared';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';
import { assetUrl } from '@/lib/files';
import { useMe } from '@/features/auth/hooks';
import { firstName, formatThreadDay, localDayKey } from '@/lib/format';
import {
  useCancelGeneration,
  useCreateGeneration,
  useCreateThread,
  useDeleteAsset,
} from '../hooks';
import type { AttachmentItem } from '../attachments/types';
import {
  isWorkingDismissed,
  setWorkingDismissed,
} from '../attachments/working-image-storage';
import { Composer, type ComposerSubmit } from './composer';
import { EmptyHero } from './empty-hero';
import { GenerationCard } from './generation-card';

function toastApiError(err: unknown): void {
  const code = err instanceof ApiError ? err.code : undefined;
  toast.error(errorMessage(code));
}

export function ThreadView({
  toolId,
  thread,
  capabilities,
  initialBaseAssetId,
}: {
  toolId: 'image' | 'video';
  thread: ThreadDetailResponse | null;
  capabilities: CapabilitiesResponse;
  /** Consumed once from ?base= to start Edit with that asset. */
  initialBaseAssetId?: string;
}) {
  const router = useRouter();
  const me = useMe();
  const tool = capabilities.tools.find((t) => t.id === toolId);
  const createThread = useCreateThread();
  const createGen = useCreateGeneration();
  const cancel = useCancelGeneration();
  const del = useDeleteAsset();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [extraRefs, setExtraRefs] = useState<AttachmentItem[]>([]);
  const [editOverride, setEditOverride] = useState<AttachmentItem | null>(null);
  const [dismissTick, setDismissTick] = useState(0);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftTick, setDraftTick] = useState(0);
  const userName = me.data?.user ? firstName(me.data.user.fullName) : '';

  const seedAttachments = useMemo(() => {
    void dismissTick;
    if (!tool || tool.attachments.max === 0) return [];
    if (editOverride) return [editOverride, ...extraRefs];
    if (initialBaseAssetId) {
      return [
        {
          key: `working-${initialBaseAssetId}`,
          assetId: initialBaseAssetId,
          previewUrl: assetUrl(initialBaseAssetId, { thumb: true }),
          uploading: false,
          working: true,
        },
        ...extraRefs,
      ];
    }
    const threadId = thread?.thread.id;
    const lastDone = [...(thread?.items ?? [])]
      .reverse()
      .find((i) => i.job.status === 'done' && i.assets[0]);
    if (
      threadId &&
      lastDone?.assets[0] &&
      !isWorkingDismissed(threadId)
    ) {
      const id = lastDone.assets[0].id;
      return [
        {
          key: `working-${id}`,
          assetId: id,
          previewUrl: assetUrl(id, { thumb: true }),
          uploading: false,
          working: true,
        },
        ...extraRefs,
      ];
    }
    return extraRefs;
  }, [tool, thread, editOverride, extraRefs, initialBaseAssetId, dismissTick]);

  const items = thread?.items ?? [];
  const daySections = useMemo(() => {
    const list = thread?.items ?? [];
    const sections: { key: string; label: string; indexes: number[] }[] = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i]!;
      const key = localDayKey(item.job.timings.queuedAt);
      const last = sections[sections.length - 1];
      if (last && last.key === key) {
        last.indexes.push(i);
      } else {
        sections.push({
          key,
          label: formatThreadDay(item.job.timings.queuedAt),
          indexes: [i],
        });
      }
    }
    return sections;
  }, [thread?.items]);

  if (!tool) {
    return (
      <EmptyState
        title="Tool unavailable"
        description="This tool is not available yet."
      />
    );
  }

  const isNew = !thread || items.length === 0;
  const quota = capabilities.limits[toolId];
  const busy = submitting || createGen.isPending || createThread.isPending;
  const maxAttach = tool.attachments.max;

  const submit = async (data: ComposerSubmit) => {
    setSubmitting(true);
    try {
      let threadId = thread?.thread.id;
      if (!threadId) {
        const created = await createThread.mutateAsync(undefined);
        threadId = created.thread.id;
        router.replace(`/create/?tool=${toolId}&thread=${threadId}`);
      }
      await createGen.mutateAsync({
        threadId,
        input: {
          tool: toolId,
          prompt: data.prompt,
          values: data.values,
          variant: data.variant,
          inputAssetIds: data.inputAssetIds,
        },
      });
      setEditOverride(null);
      setExtraRefs([]);
      setDraftPrompt('');
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const composerKey =
    `${seedAttachments.map((i) => i.key).join('|') || 'empty'}-d${draftTick}`;
  const composer = (
    <Composer
      key={composerKey}
      tool={tool}
      engineState={capabilities.engine.state}
      quota={quota}
      submitting={busy}
      onSubmit={submit}
      initialAttachments={seedAttachments}
      initialPrompt={draftPrompt}
      onWorkingDismiss={() => {
        const threadId = thread?.thread.id;
        if (threadId) setWorkingDismissed(threadId, true);
        setEditOverride(null);
        setDismissTick((n) => n + 1);
      }}
    />
  );

  const deleteDialog = (
    <ConfirmDialog
      open={Boolean(deleteId)}
      title="Delete this image?"
      description="This cannot be undone."
      confirmLabel="Delete"
      danger
      onConfirm={() => {
        if (deleteId) del.mutate(deleteId);
        setDeleteId(null);
      }}
      onOpenChange={(open) => {
        if (!open) setDeleteId(null);
      }}
    />
  );

  const cards = daySections.map((section) => (
    <section key={section.key} className="flex w-full flex-col gap-6">
      <p className="text-center text-xs text-muted-foreground">{section.label}</p>
      {section.indexes.map((i) => {
        const item = items[i]!;
        return (
          <GenerationCard
            key={item.job.id}
            job={item.job}
            assets={item.assets}
            canAddReference={extraRefs.length + 1 < maxAttach}
            onCancel={() => cancel.mutate(item.job.id)}
            onRegenerate={() => {
              const threadId = thread?.thread.id;
              if (!threadId) return;
              void createGen
                .mutateAsync({
                  threadId,
                  input: {
                    tool: toolId,
                    prompt: item.job.prompt,
                    values: item.job.params,
                    variant: item.job.variant,
                    inputAssetIds: item.job.inputAssetIds,
                  },
                })
                .catch(toastApiError);
            }}
            onEdit={(assetId) => {
              const threadId = thread?.thread.id;
              if (threadId) setWorkingDismissed(threadId, false);
              setEditOverride({
                key: `working-${assetId}`,
                assetId,
                previewUrl: assetUrl(assetId, { thumb: true }),
                uploading: false,
                working: true,
              });
              setExtraRefs([]);
            }}
            onEditPrompt={() => {
              setDraftPrompt(item.job.prompt);
              setDraftTick((n) => n + 1);
            }}
            onAddReference={(assetId) => {
              setExtraRefs((prev) => {
                if (prev.some((p) => p.assetId === assetId)) return prev;
                if (prev.length + 1 >= maxAttach) return prev;
                return [
                  ...prev,
                  {
                    key: `ref-${assetId}`,
                    assetId,
                    previewUrl: assetUrl(assetId, { thumb: true }),
                    uploading: false,
                  },
                ];
              });
            }}
            onDelete={setDeleteId}
          />
        );
      })}
    </section>
  ));

  if (isNew) {
    return (
      <div className="flex min-h-full w-full min-w-0 flex-1 flex-col items-center px-0 py-6">
        <div className="min-h-6 flex-1" aria-hidden />
        <EmptyHero
          name={userName}
          onPickIdea={(idea) => {
            setDraftPrompt(idea);
            setDraftTick((n) => n + 1);
          }}
        />
        <div className="w-full min-w-0 max-w-4xl">{composer}</div>
        <div className="min-h-6 flex-1" aria-hidden />
        {deleteDialog}
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col">
      <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col gap-8 pb-6">
        {cards}
      </div>
      <div className="sticky bottom-0 z-20 w-full min-w-0 pt-3 pb-2">
        <div className="mx-auto w-full min-w-0 max-w-4xl">{composer}</div>
      </div>
      {deleteDialog}
    </div>
  );
}
