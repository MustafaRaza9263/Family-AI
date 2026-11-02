'use client';

import type { CapabilitiesResponse, ThreadDetailResponse } from '@studio/shared';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useMe } from '@/features/auth/hooks';
import { ApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';
import { assetUrl } from '@/lib/files';
import { firstName, formatThreadDay, localDayKey } from '@/lib/format';
import type { AttachmentItem } from '../attachments/types';
import {
  isWorkingDismissed,
  setWorkingDismissed,
} from '../attachments/working-image-storage';
import {
  useCancelGeneration,
  useCreateGeneration,
  useCreateThread,
  useDeleteAsset,
  useExtractFrame,
} from '../hooks';
import { useRegenMap } from '../use-regen-map';
import {
  groupThreadItems,
  keptVersions,
  activeAttempt,
  type VersionGroup,
} from '../version-groups';
import { Composer, type ComposerSubmit } from './composer';
import { EmptyHero } from './empty-hero';
import { ThreadCards } from './thread-cards';

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
  /** Consumed once from ?base= (image edit working / video start frame). */
  initialBaseAssetId?: string;
}) {
  const router = useRouter();
  const me = useMe();
  const tool = capabilities.tools.find((t) => t.id === toolId);
  const createThread = useCreateThread();
  const createGen = useCreateGeneration();
  const cancel = useCancelGeneration();
  const del = useDeleteAsset();
  const extractFrame = useExtractFrame();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [extraRefs, setExtraRefs] = useState<AttachmentItem[]>([]);
  const [editOverride, setEditOverride] = useState<AttachmentItem | null>(null);
  const [continueFrame, setContinueFrame] = useState<AttachmentItem | null>(
    null,
  );
  const [dismissTick, setDismissTick] = useState(0);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftTick, setDraftTick] = useState(0);
  const userName = me.data?.user ? firstName(me.data.user.fullName) : '';

  const threadId = thread?.thread.id;
  const { map: regenMap, link: linkRegenJob } = useRegenMap(threadId);

  const groups = useMemo(
    () => groupThreadItems(thread?.items ?? [], regenMap),
    [thread?.items, regenMap],
  );

  const seedAttachments = useMemo(() => {
    void dismissTick;
    if (!tool || tool.attachments.max === 0) return [];

    if (toolId === 'video') {
      if (continueFrame) return [continueFrame];
      if (initialBaseAssetId) {
        return [
          {
            key: `start-${initialBaseAssetId}`,
            assetId: initialBaseAssetId,
            previewUrl: assetUrl(initialBaseAssetId, { thumb: true }),
            uploading: false,
          },
        ];
      }
      return [];
    }

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
    const tid = thread?.thread.id;
    // Prefer the latest kept version of the latest card (regen stays in place).
    const lastDone = [...groups]
      .reverse()
      .map((g) => keptVersions(g.versions).at(-1))
      .find((i) => i && i.assets[0]);
    if (tid && lastDone?.assets[0] && !isWorkingDismissed(tid)) {
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
  }, [
    tool,
    toolId,
    thread,
    groups,
    editOverride,
    extraRefs,
    initialBaseAssetId,
    continueFrame,
    dismissTick,
  ]);

  const daySections = useMemo(() => {
    const sections: {
      key: string;
      label: string;
      groupIndexes: number[];
    }[] = [];
    for (let i = 0; i < groups.length; i++) {
      const root = groups[i]!.versions[0]!;
      const key = localDayKey(root.job.timings.queuedAt);
      const last = sections[sections.length - 1];
      if (last && last.key === key) {
        last.groupIndexes.push(i);
      } else {
        sections.push({
          key,
          label: formatThreadDay(root.job.timings.queuedAt),
          groupIndexes: [i],
        });
      }
    }
    return sections;
  }, [groups]);

  if (!tool) {
    return (
      <EmptyState
        title="Tool unavailable"
        description="This tool is not available yet."
      />
    );
  }

  const isNew = !thread || groups.length === 0;
  const quota = capabilities.limits[toolId];
  const busy =
    submitting ||
    createGen.isPending ||
    createThread.isPending ||
    extractFrame.isPending;
  const maxAttach = tool.attachments.max;

  const submit = async (data: ComposerSubmit) => {
    setSubmitting(true);
    try {
      let threadId = thread?.thread.id;
      if (!threadId) {
        const created = await createThread.mutateAsync({ tool: toolId });
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
      setContinueFrame(null);
      setDraftPrompt('');
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Include toolId so switching image↔video remounts and does not leak
  // video controls (quality/duration) into image jobs (instant ENGINE_FAILED).
  const composerKey =
    `${toolId}-${seedAttachments.map((i) => i.key).join('|') || 'empty'}-d${draftTick}`;
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
      title={toolId === 'video' ? 'Delete this video?' : 'Delete this image?'}
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

  const bumpDraft = (prompt: string) => {
    setDraftPrompt(prompt);
    setDraftTick((n) => n + 1);
  };

  const regenerate = (group: VersionGroup) => {
    const tid = thread?.thread.id;
    if (!tid) return;
    // Block only while queued/running — failed/cancelled must allow Try again.
    if (activeAttempt(group.versions)) return;
    const root = group.versions[0]!;
    const fromId = group.versions[group.versions.length - 1]!.job.id;
    void createGen
      .mutateAsync({
        threadId: tid,
        input: {
          tool: toolId,
          prompt: root.job.prompt,
          values: root.job.params,
          variant: root.job.variant,
          inputAssetIds: root.job.inputAssetIds,
        },
        onCreated: (data) => {
          linkRegenJob(data.job.id, fromId);
        },
      })
      .catch(toastApiError);
  };

  const cards = (
    <ThreadCards
      toolId={toolId}
      groups={groups}
      daySections={daySections}
      maxAttach={maxAttach}
      extraRefs={extraRefs}
      onCancel={(jobId) => cancel.mutate(jobId)}
      onRegenerate={regenerate}
      onContinueFrame={(att) => {
        setContinueFrame(att);
        setDraftTick((n) => n + 1);
      }}
      onEditPrompt={bumpDraft}
      onEdit={(assetId) => {
        const tid = thread?.thread.id;
        if (tid) setWorkingDismissed(tid, false);
        setEditOverride({
          key: `working-${assetId}`,
          assetId,
          previewUrl: assetUrl(assetId, { thumb: true }),
          uploading: false,
          working: true,
        });
        setExtraRefs([]);
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
      onAnimate={(assetId) => {
        router.push(`/create/?tool=video&base=${assetId}`);
      }}
      onDelete={setDeleteId}
      extractFrame={(id, at) =>
        extractFrame.mutateAsync({ assetId: id, at })
      }
      onError={toastApiError}
      onContinueToast={() => toast.success('Last frame added as Start frame')}
    />
  );

  if (isNew) {
    return (
      <div className="flex min-h-full w-full min-w-0 flex-1 flex-col items-center px-0 py-6">
        <div className="min-h-6 flex-1" aria-hidden />
        <EmptyHero
          name={userName}
          onPickIdea={(idea) => bumpDraft(idea)}
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
