'use client';

/**
 * Right-side job detail drawer for the admin jobs page.
 * Polls /api/admin/runs/:id every 2s while the job is running, merging live data.
 */

import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import type { AdminJobDetail } from '@studio/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbox } from '@/components/ui/lightbox';
import { VideoLightbox } from '@/components/ui/video-lightbox';
import {
  Sheet,
  SheetContent,
  SheetCloseButton,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { assetUrl } from '@/lib/files';
import { useAdminJob } from './hooks';
import { getWarmCold } from './job-warm';
import {
  HardwareTiles,
  NodeWaterfall,
  PhaseBar,
  RawJsonSection,
  TimingBar,
} from './job-drawer-metrics';

// ---- status + warm/cold badges ------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-muted-foreground/15 text-muted-foreground',
  running: 'bg-primary/15 text-primary',
  done: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  cancelled: 'bg-warning/15 text-warning',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ''}`}>
      {status}
    </span>
  );
}

function WarmColdBadge({ warm }: { warm: boolean | null }) {
  if (warm === null) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${warm ? 'bg-success/10 text-success' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
      {warm ? 'Warm' : 'Cold'}
    </span>
  );
}

// ---- params chips --------------------------------------------------------

function ParamsChips({ params }: { params: AdminJobDetail['params'] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(params).map(([k, v]) => (
        <span key={k} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">
          <span className="text-muted-foreground">{k}:</span> {String(v)}
        </span>
      ))}
    </div>
  );
}

// ---- outputs section -----------------------------------------------------

function OutputsSection({ job }: { job: AdminJobDetail }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  const imgAssets = job.outputAssets.filter((a) => a.kind === 'image');
  const vidAssets = job.outputAssets.filter((a) => a.kind === 'video');

  if (job.outputAssets.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Outputs</p>
      <div className="flex flex-wrap gap-2">
        {imgAssets.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setLightboxIdx(i)}
            className="size-16 overflow-hidden rounded-lg border border-border bg-surface-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(a.id, { thumb: true })}
              alt="Output"
              className="size-full object-cover"
            />
          </button>
        ))}
        {vidAssets.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setVideoId(a.id)}
            className="size-16 overflow-hidden rounded-lg border border-border bg-surface-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(a.id, { thumb: true })}
              alt="Video"
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>
      {lightboxIdx !== null ? (
        <Lightbox
          src={assetUrl(imgAssets[lightboxIdx]!.id)}
          alt="Output image"
          onClose={() => setLightboxIdx(null)}
          hasPrev={lightboxIdx > 0}
          hasNext={lightboxIdx < imgAssets.length - 1}
          onPrev={() => setLightboxIdx((i) => Math.max(0, (i ?? 1) - 1))}
          onNext={() => setLightboxIdx((i) => Math.min(imgAssets.length - 1, (i ?? 0) + 1))}
        />
      ) : null}
      {videoId ? (
        <VideoLightbox assetId={videoId} onClose={() => setVideoId(null)} />
      ) : null}
    </div>
  );
}

// ---- drawer content ------------------------------------------------------

function DrawerBody({ jobId }: { jobId: string }) {
  const { data, isLoading, isError } = useAdminJob(jobId);
  const job = data?.job;

  // Merge live snapshot into metrics when running.
  const isRunning = job?.status === 'running';
  useEffect(() => {
    // Re-run the query every 2s while running (useAdminJob sets refetchInterval).
    void isRunning;
  }, [isRunning]);

  if (isLoading) {
    return (
      <div className="space-y-3 px-5 py-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <p className="px-5 py-4 text-sm text-danger">Could not load job detail.</p>
    );
  }

  const warmCold = getWarmCold(job.metricsFull);
  const metrics = job.metricsFull;

  return (
    <div className="space-y-5 px-5 py-4 pb-10">
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={job.status} />
        <WarmColdBadge warm={warmCold === null ? null : warmCold === 'warm'} />
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">
          {job.recipeId}
        </span>
        {job.variant ? (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">{job.variant}</span>
        ) : null}
      </div>

      {/* Prompt */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Prompt</p>
          <button
            type="button"
            aria-label="Copy prompt"
            onClick={() => void navigator.clipboard.writeText(job.prompt)}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <Copy className="size-3.5" />
          </button>
        </div>
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm leading-relaxed">
          {job.prompt}
        </p>
      </div>

      {/* Params */}
      {Object.keys(job.params).length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Params</p>
          <ParamsChips params={job.params} />
        </div>
      ) : null}

      {/* Inputs */}
      {job.inputAssets.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Inputs</p>
          <div className="flex flex-wrap gap-2">
            {job.inputAssets.map((a) => (
              <div key={a.id} className="size-16 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(a.id, { thumb: true })} alt="Input" className="size-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <OutputsSection job={job} />

      {/* Failure block */}
      {job.status === 'failed' && job.errorDetail ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-danger">Error detail</p>
          <pre className="overflow-x-auto rounded-lg bg-danger/5 border border-danger/20 p-3 text-[10px] leading-relaxed text-danger">
            {job.errorDetail}
          </pre>
        </div>
      ) : null}

      <TimingBar job={job} />

      {/* Output facts */}
      {job.outputs.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Output facts</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {job.outputs.map((o) => (
              <div key={o.assetId} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5">
                <span className="text-muted-foreground">{o.kind} </span>
                {o.width}×{o.height}
                {o.durationSec != null ? ` · ${o.durationSec.toFixed(1)}s` : ''}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Full metrics */}
      {metrics ? (
        <>
          <PhaseBar phases={metrics.phases} />
          <NodeWaterfall nodes={metrics.nodes} />
          <HardwareTiles hw={metrics.hardware} />
        </>
      ) : null}

      {job.metricsExpired ? (
        <p className="text-xs text-muted-foreground">
          Detailed metrics not available (expired or not yet recorded).
        </p>
      ) : null}

      {/* Raw JSON */}
      <RawJsonSection data={job} />
    </div>
  );
}

// ---- exported drawer wrapper --------------------------------------------

export function JobDrawer({
  jobId,
  onClose,
}: {
  jobId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={jobId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Job detail</SheetTitle>
          <SheetCloseButton />
        </SheetHeader>
        {jobId ? <DrawerBody jobId={jobId} /> : null}
      </SheetContent>
    </Sheet>
  );
}
