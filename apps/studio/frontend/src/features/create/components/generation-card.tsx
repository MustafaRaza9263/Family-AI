'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Lightbox } from '@/components/ui/lightbox';
import { jobLiveKey, type JobLiveState } from '@/features/events/job-live';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';
import { assetUrl } from '@/lib/files';
import { parseAspect } from '../media-size';
import { useVersionNav } from '../use-version-nav';
import type { ThreadItem } from '../version-groups';
import { GenerationActions } from './generation-actions';
import {
  cardState,
  formatTook,
  StatusLabel,
  statusPlain,
  useLiveTimer,
} from './generation-status';
import { LightMatrixCanvas } from './light-matrix-canvas';
import { PromptMessage } from './prompt-message';
import { VersionSwitcher } from './version-switcher';

const CARD_W = 300;

export function GenerationCard({
  versions,
  canAddReference,
  onCancel,
  onRegenerate,
  onEdit,
  onEditPrompt,
  onAddReference,
  onAnimate,
  onDelete,
}: {
  versions: ThreadItem[];
  canAddReference: boolean;
  onCancel: (jobId: string) => void;
  onRegenerate: () => void;
  onEdit: (assetId: string) => void;
  onEditPrompt: () => void;
  onAddReference: (assetId: string) => void;
  onAnimate?: (assetId: string) => void;
  onDelete: (assetId: string) => void;
}) {
  const nav = useVersionNav(versions);
  const job = nav.active.job;
  const assets = nav.active.assets;
  const root = versions[0]!;

  const { data: live } = useQuery<JobLiveState>({
    queryKey: jobLiveKey(job.id),
    queryFn: () => ({}),
    staleTime: Infinity,
    enabled: job.status === 'queued' || job.status === 'running',
  });

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [localStartedAt, setLocalStartedAt] = useState<string | undefined>();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- per-job timer seed
    setLocalStartedAt(
      job.timings.startedAt ??
        (job.status === 'running' ? new Date().toISOString() : undefined),
    );
  }, [job.id, job.status, job.timings.startedAt]);

  const asset = assets[0] ?? null;
  const assetId = asset?.id ?? job.outputAssetIds[0];
  const fullSrc = assetId ? assetUrl(assetId) : null;
  const thumbSrc = assetId ? assetUrl(assetId, { thumb: true }) : null;
  const lightboxIds =
    assets.length > 0
      ? assets.map((a: { id: string }) => a.id)
      : assetId
        ? [assetId]
        : [];
  const lightboxId =
    openIndex !== null ? (lightboxIds[openIndex] ?? null) : null;
  const aspect =
    typeof job.params.aspectRatio === 'string'
      ? job.params.aspectRatio
      : typeof root.job.params.aspectRatio === 'string'
        ? root.job.params.aspectRatio
        : '1:1';
  const { w: aw, h: ah } = parseAspect(aspect);
  const state = cardState(job, live?.stage);
  const progress =
    typeof live?.progressValue === 'number' &&
    typeof live?.progressMax === 'number' &&
    live.progressMax > 0
      ? Math.min(1, live.progressValue / live.progressMax)
      : state === 'finishing' || state === 'done'
        ? 1
        : 0;
  const pct = Math.round(progress * 100);
  const startedAt = job.timings.startedAt ?? localStartedAt;
  const timer = useLiveTimer(
    startedAt,
    state === 'preparing' || state === 'generating' || state === 'finishing',
  );
  const took = useMemo(
    () => formatTook(job.timings.startedAt, job.timings.finishedAt),
    [job.timings.startedAt, job.timings.finishedAt],
  );
  const plain = statusPlain(state, live?.position, pct, nav.regenerating);
  const showMatrix =
    state !== 'done' && (nav.viewingLive || !nav.regenerating);
  const showImage = state === 'done' && Boolean(fullSrc);
  const showStillWhileLive =
    nav.regenerating && !nav.viewingLive && Boolean(fullSrc);
  const canCancel =
    state === 'queued' ||
    state === 'preparing' ||
    state === 'generating' ||
    state === 'finishing';
  const hideRetry = nav.regenerating && state === 'failed';

  return (
    <article className="flex w-full flex-col gap-5">
      <PromptMessage
        prompt={root.job.prompt}
        inputAssetIds={root.job.inputAssetIds}
        onEdit={onEditPrompt}
      />

      <div
        className="flex w-full max-w-full flex-col gap-2.5 self-start"
        style={{ width: CARD_W }}
        data-state={state}
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-[18px] border border-border',
            'bg-[radial-gradient(120%_90%_at_50%_50%,#08121a_0%,var(--surface)_60%)]',
            'transition-[border-color] duration-500',
            (state === 'failed' || state === 'cancelled') && 'border-danger/30',
          )}
          style={{ aspectRatio: `${aw} / ${ah}` }}
        >
          {showMatrix ? (
            <LightMatrixCanvas
              fill
              aspectRatio={aspect}
              label={plain}
              tone={
                state === 'failed' || state === 'cancelled'
                  ? 'danger'
                  : 'primary'
              }
              className="absolute inset-0 size-full rounded-none border-0"
            />
          ) : null}

          {(showImage || showStillWhileLive) && fullSrc ? (
            <button
              type="button"
              className="absolute inset-0 block size-full outline-none"
              onClick={() => setOpenIndex(0)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc ?? fullSrc}
                alt=""
                className="block size-full object-cover"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (thumbSrc && img.src.includes('thumb=1')) {
                    img.src = fullSrc;
                  }
                }}
              />
            </button>
          ) : null}

          {state === 'queued' && (nav.viewingLive || !nav.showSwitcher) ? (
            <span
              className={cn(
                'absolute top-2.5 left-2.5 rounded-full px-2 py-1',
                'border border-primary/25 bg-primary/10 font-mono text-[11px] font-semibold',
                'tracking-wider text-primary backdrop-blur-sm',
              )}
            >
              #{live?.position ?? 1}
            </span>
          ) : null}

          <VersionSwitcher
            view={nav.view}
            total={nav.total}
            live={nav.viewingLive}
            canPrev={nav.canPrev}
            canNext={nav.canNext}
            onPrev={() => nav.setView(nav.view - 1)}
            onNext={() => nav.setView(nav.view + 1)}
          />

          <span
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left',
              'bg-gradient-to-r from-primary/20 to-primary',
              'shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_90%,transparent)]',
              'transition-[transform,opacity] duration-400',
              (state === 'generating' || state === 'finishing') &&
                (nav.viewingLive || !nav.showSwitcher)
                ? 'opacity-100'
                : 'opacity-0',
            )}
            style={{ transform: `scaleX(${progress})` }}
            aria-hidden
          />
        </div>

        <div className="flex h-8 items-center gap-2 px-0.5">
          {state !== 'done' && (nav.viewingLive || !nav.showSwitcher) ? (
            <div className="flex w-full items-center gap-2">
              <span
                className={cn(
                  'size-[7px] shrink-0 rounded-full',
                  state === 'failed' &&
                    'bg-danger shadow-[0_0_10px_color-mix(in_srgb,var(--danger)_80%,transparent)]',
                  state === 'cancelled' &&
                    'bg-danger shadow-[0_0_10px_color-mix(in_srgb,var(--danger)_80%,transparent)]',
                  state === 'queued' && 'animate-pulse bg-muted-foreground',
                  (state === 'preparing' ||
                    state === 'generating' ||
                    state === 'finishing') &&
                    'animate-pulse bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_90%,transparent)]',
                )}
                aria-hidden
              />
              <span
                className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground"
                role="status"
              >
                <StatusLabel
                  state={state}
                  position={live?.position}
                  pct={pct}
                  regenerating={nav.regenerating}
                />
              </span>
              {timer ? (
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {timer}
                </span>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  data-tip="Cancel"
                  data-tip-side="below"
                  data-tip-align="end"
                  aria-label="Cancel"
                  onClick={() => setConfirmCancel(true)}
                  className={cn(
                    'grid size-[30px] place-items-center rounded-full text-muted-foreground',
                    'transition duration-200 hover:bg-danger/10 hover:text-danger',
                  )}
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              ) : null}
              {state === 'failed' && !hideRetry ? (
                <button
                  type="button"
                  data-tip="Try again"
                  data-tip-side="below"
                  data-tip-align="end"
                  aria-label="Try again"
                  onClick={onRegenerate}
                  className={cn(
                    'grid size-[30px] place-items-center rounded-full text-muted-foreground',
                    'transition duration-200 hover:bg-primary/10 hover:text-primary',
                  )}
                >
                  <RefreshCw className="size-4" />
                </button>
              ) : null}
            </div>
          ) : state === 'done' || (!nav.viewingLive && nav.showSwitcher) ? (
            <GenerationActions
              assetId={assetId}
              prompt={root.job.prompt}
              took={took}
              canAddReference={canAddReference}
              onEdit={() => assetId && onEdit(assetId)}
              onAddReference={() => assetId && onAddReference(assetId)}
              onAnimate={
                onAnimate && assetId
                  ? () => onAnimate(assetId)
                  : undefined
              }
              onRegenerate={onRegenerate}
              onDelete={() => assetId && onDelete(assetId)}
            />
          ) : null}
        </div>

        {state === 'failed' && job.errorCode && (nav.viewingLive || !nav.showSwitcher) ? (
          <p className="px-0.5 text-xs text-danger">{errorMessage(job.errorCode)}</p>
        ) : null}
      </div>

      {lightboxId !== null && openIndex !== null ? (
        <Lightbox
          src={assetUrl(lightboxId)}
          alt={root.job.prompt}
          onClose={() => setOpenIndex(null)}
          hasPrev={openIndex > 0}
          hasNext={openIndex < lightboxIds.length - 1}
          onPrev={() => setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() =>
            setOpenIndex((i) =>
              i !== null && i < lightboxIds.length - 1 ? i + 1 : i,
            )
          }
        />
      ) : null}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this generation?"
        description="This will stop the job. You can start a new one anytime."
        confirmLabel="Cancel generation"
        cancelLabel="Keep generating"
        danger
        onConfirm={() => {
          onCancel(job.id);
          setConfirmCancel(false);
        }}
        onOpenChange={setConfirmCancel}
      />
    </article>
  );
}
