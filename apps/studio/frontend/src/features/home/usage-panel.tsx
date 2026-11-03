'use client';

import { useEffect, useState } from 'react';
import { toolUi, type ToolId } from '@/features/create/tool-ui';
import { cn } from '@/lib/cn';

type Quota = { dailyRuns: number; used: number; remaining: number };

function resetLabel(now = new Date()): string {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const mins = Math.max(
    0,
    Math.ceil((midnight.getTime() - now.getTime()) / 60_000),
  );
  return `Resets in ${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Columns: 20 for large quotas (e.g. 100 → 5 rows), else one row. */
function columnsFor(total: number): number {
  if (total <= 25) return Math.max(total, 1);
  return 20;
}

function Meter({
  toolId,
  quota,
}: {
  toolId: ToolId;
  quota: Quota;
}) {
  const ui = toolUi(toolId);
  const Icon = ui.icon;
  const total = Math.max(0, quota.dailyRuns);
  const used = Math.min(Math.max(0, quota.used), total);
  const cols = columnsFor(total);
  const isImage = toolId === 'image';

  return (
    <div className="last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <Icon className="size-3.5 text-muted-foreground" strokeWidth={2} />
          {ui.title}s
        </span>
        <span className="font-semibold tabular-nums text-foreground">
          {used} / {total}
        </span>
      </div>

      <div
        className="mb-1.5 grid gap-[3px] py-0.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="meter"
        aria-valuenow={used}
        aria-valuemax={total}
        aria-label={`${ui.title}s used`}
      >
        {Array.from({ length: total }, (_, i) => {
          const active = i < used;
          return (
            <span
              key={i}
              title={`${ui.title} ${i + 1}`}
              className={cn(
                'usage-dot aspect-square w-full rounded-full',
                'bg-[color-mix(in_srgb,var(--foreground)_14%,transparent)]',
                'transition-[transform,background-color] duration-200',
                '[transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
                'hover:relative hover:z-[2] hover:scale-[1.6]',
                active && isImage && 'bg-[#3b82f6] hover:bg-[#60a5fa]',
                active && !isImage && 'bg-[#a855f7] hover:bg-[#c084fc]',
                !active &&
                  'hover:bg-[color-mix(in_srgb,var(--foreground)_35%,transparent)]',
              )}
            />
          );
        })}
      </div>

      <div className="flex justify-between text-[10px] font-medium tracking-wide text-muted-foreground">
        <span>{used} used</span>
        <span>{quota.remaining} left</span>
      </div>
    </div>
  );
}

export function UsagePanel({
  image,
  video,
  showVideo,
}: {
  image: Quota;
  video?: Quota;
  showVideo: boolean;
}) {
  const [reset, setReset] = useState(() => resetLabel());

  useEffect(() => {
    const id = window.setInterval(() => setReset(resetLabel()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      className="flex h-full min-w-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-soft)]"
      aria-labelledby="home-usage"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="home-usage"
          className="m-0 text-xs font-semibold tracking-tight"
        >
          Usage today
        </h2>
        <span className="text-[10.5px] font-medium text-muted-foreground">
          {reset}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3.5">
        <Meter toolId="image" quota={image} />
        {showVideo && video ? <Meter toolId="video" quota={video} /> : null}
      </div>
    </section>
  );
}
