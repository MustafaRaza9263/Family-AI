'use client';

/**
 * Fixed-height strip above every admin tab.
 * One row with horizontal scroll on narrow viewports — never grows taller.
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import {
  formatDurationMs,
  formatMbAsGb,
  formatPercent,
  formatWatts,
} from '@/lib/format';
import type { AdminEventsState } from './use-admin-events';
import { Sparkline } from './sparkline';

const ENGINE_LABELS: Record<string, string> = {
  ready: 'Ready',
  paused: 'Paused',
  unavailable: 'Unavailable',
};

const ENGINE_COLORS: Record<string, string> = {
  ready: 'bg-success/15 text-success',
  paused: 'bg-warning/15 text-warning',
  unavailable: 'bg-danger/15 text-danger',
};

function EngineBadge({ state }: { state: string }) {
  const label = ENGINE_LABELS[state] ?? state;
  const color =
    ENGINE_COLORS[state] ?? 'bg-muted-foreground/15 text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        color,
      )}
    >
      {label}
    </span>
  );
}

function useElapsed(startedAt: string | undefined): string {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setMs(Date.now() - new Date(startedAt).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt ? formatDurationMs(ms) : '';
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 shrink-0 flex-col items-start gap-0.5',
        className,
      )}
    >
      <span className="text-[10px] leading-none text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

type Props = {
  state: AdminEventsState;
  onOpenJob?: (jobId: string) => void;
};

export function LiveStrip({ state, onOpenJob }: Props) {
  const { connected, live, ring } = state;
  const elapsed = useElapsed(live?.running?.startedAt);

  const hw = live?.hardware ?? null;
  const memTotal = hw?.memTotalMb ?? null;
  const memMax =
    memTotal ??
    Math.max(...ring.memUsedMb.filter((v): v is number => v !== null), 1);

  // Keep last live snapshot during brief reconnects; only show paused when
  // we have never received data (or the stream stayed down with no snapshot).
  if (!connected && !live) {
    return (
      <div className="flex h-12 items-center gap-2 overflow-hidden rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs text-muted-foreground sm:h-14">
        <span className="size-1.5 shrink-0 rounded-full bg-warning" />
        Live data paused
      </div>
    );
  }

  return (
    <div className="flex h-12 items-center overflow-x-auto overflow-y-hidden rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs scrollbar-none sm:h-14">
      <div className="flex h-full min-w-max items-center gap-3 sm:gap-4">
        <div className="flex shrink-0 items-center gap-2">
          {live ? (
            <EngineBadge state={live.engine} />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          {live ? (
            <span className="whitespace-nowrap text-muted-foreground">
              Queue: <strong className="text-foreground">{live.queued}</strong>
            </span>
          ) : null}
          {!connected ? <span className="text-warning">· Paused</span> : null}
        </div>

        {live?.running ? (
          <button
            type="button"
            onClick={() => onOpenJob?.(live.running!.jobId)}
            className="flex max-w-48 shrink-0 items-center gap-1.5 truncate rounded-full bg-primary/10 px-2.5 py-1 text-primary transition hover:bg-primary/20"
          >
            <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
            <span className="truncate font-medium">{live.running.userName}</span>
            <span className="hidden text-muted-foreground sm:inline">
              {live.running.stage}
            </span>
            <span className="tabular-nums">{elapsed}</span>
          </button>
        ) : null}

        <div className="flex shrink-0 items-center gap-3 border-l border-border pl-3 sm:gap-3.5 sm:pl-4">
          <Metric
            label="GPU"
            value={hw ? formatPercent(hw.gpuUtilPct ?? 0) : 'n/a'}
          />
          <Metric
            label="Power"
            value={hw?.powerW != null ? formatWatts(hw.powerW) : 'n/a'}
            className="hidden sm:flex"
          />
          <Metric
            label="Temp"
            value={hw?.tempC != null ? `${Math.round(hw.tempC)}°C` : 'n/a'}
            className="hidden sm:flex"
          />
          <Metric
            label="Mem"
            value={
              hw?.memUsedMb != null && memTotal != null
                ? `${formatMbAsGb(hw.memUsedMb)} / ${formatMbAsGb(memTotal)}`
                : hw?.memUsedMb != null
                  ? formatMbAsGb(hw.memUsedMb)
                  : 'n/a'
            }
          />
          <Metric
            label="Swap"
            value={hw?.swapUsedMb != null ? formatMbAsGb(hw.swapUsedMb) : 'n/a'}
            className="hidden md:flex"
          />
        </div>

        <div className="hidden shrink-0 items-center gap-3 border-l border-border pl-4 sm:flex">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-muted-foreground">GPU %</span>
            <Sparkline
              data={ring.gpuUtil}
              max={100}
              width={64}
              height={18}
              className="text-primary"
            />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-muted-foreground">Mem GB</span>
            <Sparkline
              data={ring.memUsedMb}
              max={memMax}
              width={64}
              height={18}
              className="text-success"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
