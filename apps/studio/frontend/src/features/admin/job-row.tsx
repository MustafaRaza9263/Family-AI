'use client';

/**
 * Single row in the admin jobs list view.
 */

import type { AdminJobRow } from '@studio/shared';
import { assetUrl } from '@/lib/files';
import { formatDurationMs, formatPercent } from '@/lib/format';

const STATUS_COLORS: Record<string, string> = {
  queued: 'text-muted-foreground',
  running: 'text-primary',
  done: 'text-success',
  failed: 'text-danger',
  cancelled: 'text-warning',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Props = {
  job: AdminJobRow;
  onClick: () => void;
};

export function JobRow({ job, onClick }: Props) {
  const thumb = job.outputs[0];
  const gpuPeak = job.metrics?.gpuUtilPeak;
  const warmDot = job.metrics != null
    ? (job.metrics.warm ? '🟢' : '⚪')
    : null;

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-border transition hover:bg-surface-muted/50"
    >
      {/* Thumb / poster */}
      <td className="py-2 pl-3 pr-2">
        <div className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-muted">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(thumb.assetId, { thumb: true })}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full" />
          )}
        </div>
      </td>

      {/* Prompt */}
      <td className="max-w-56 py-2 pr-3">
        <p
          className="line-clamp-2 text-xs leading-tight"
          title={job.prompt}
        >
          {job.prompt}
        </p>
      </td>

      {/* User */}
      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {job.user.fullName}
      </td>

      {/* Mode badge */}
      <td className="py-2 pr-3">
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px]">
          {job.recipeId}
          {job.variant ? ` · ${job.variant}` : ''}
        </span>
      </td>

      {/* Status */}
      <td className={`py-2 pr-3 text-xs font-medium whitespace-nowrap ${STATUS_COLORS[job.status] ?? ''}`}>
        {job.status}
      </td>

      {/* Queue wait */}
      <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {job.queueWaitMs != null ? formatDurationMs(job.queueWaitMs) : '—'}
      </td>

      {/* Run time */}
      <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {job.runMs != null ? formatDurationMs(job.runMs) : '—'}
      </td>

      {/* Warm dot */}
      <td className="py-2 pr-3 text-center text-xs">{warmDot}</td>

      {/* GPU peak */}
      <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {gpuPeak != null ? formatPercent(gpuPeak) : '—'}
      </td>

      {/* Relative time */}
      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {relativeTime(job.queuedAt)}
      </td>
    </tr>
  );
}

/** Grid tile for the grid view. */
export function JobTile({
  job,
  onClick,
}: {
  job: AdminJobRow;
  onClick: () => void;
}) {
  const thumb = job.outputs[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="aspect-square w-full bg-surface-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(thumb.assetId, { thumb: true })}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            {job.tool}
          </div>
        )}
      </div>
      <div className="p-2 text-left">
        <p className="line-clamp-1 text-xs font-medium">{job.user.fullName}</p>
        <p className="line-clamp-1 text-[10px] text-muted-foreground">{job.status}</p>
      </div>
    </button>
  );
}
