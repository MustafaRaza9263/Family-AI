'use client';

import type { CapabilitiesResponse, ThreadDetailResponse } from '@studio/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useCancelGeneration,
  useCreateGeneration,
  useCreateThread,
  useDeleteAsset,
} from '../hooks';
import { Composer, type ComposerSubmit } from './composer';
import { GenerationCard } from './generation-card';

export function ThreadView({
  toolId,
  thread,
  capabilities,
}: {
  toolId: 'image' | 'video';
  /** null = brand-new draft; thread is created on first submit. */
  thread: ThreadDetailResponse | null;
  capabilities: CapabilitiesResponse;
}) {
  const router = useRouter();
  const tool = capabilities.tools.find((t) => t.id === toolId);
  const createThread = useCreateThread();
  const createGen = useCreateGeneration();
  const cancel = useCancelGeneration();
  const del = useDeleteAsset();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!tool) {
    return (
      <EmptyState
        title="Tool unavailable"
        description="This tool is not available yet."
      />
    );
  }

  const items = thread?.items ?? [];
  const isNew = !thread || items.length === 0;
  const quota = capabilities.limits[toolId];
  const busy = submitting || createGen.isPending || createThread.isPending;

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
    } finally {
      setSubmitting(false);
    }
  };

  const regenerate = (
    prompt: string,
    values: Record<string, string | number | boolean>,
    variant?: string,
  ) => {
    const threadId = thread?.thread.id;
    if (!threadId) return;
    void createGen.mutateAsync({
      threadId,
      input: {
        tool: toolId,
        prompt,
        values,
        variant,
        inputAssetIds: [],
      },
    });
  };

  const composer = (
    <Composer
      tool={tool}
      engineState={capabilities.engine.state}
      quota={quota}
      submitting={busy}
      onSubmit={submit}
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

  // New image: only a centered input — no empty-state copy, no sticky bar.
  if (isNew) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-6">
        <div className="w-full max-w-4xl">{composer}</div>
        {deleteDialog}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col items-end gap-4 pb-6">
        {items.map((item) => (
          <GenerationCard
            key={item.job.id}
            job={item.job}
            assets={item.assets}
            onCancel={() => cancel.mutate(item.job.id)}
            onRegenerate={() =>
              regenerate(item.job.prompt, item.job.params, item.job.variant)
            }
            onDelete={setDeleteId}
          />
        ))}
      </div>

      {/* Opaque only under the box so feed above stays visible */}
      <div className="sticky bottom-0 z-20 pt-3 pb-2">
        <div className="mx-auto w-full max-w-4xl rounded-[var(--radius-card)] bg-background">
          {composer}
        </div>
      </div>

      {deleteDialog}
    </div>
  );
}
