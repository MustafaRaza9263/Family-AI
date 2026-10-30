'use client';

import type { JobStage } from '@studio/shared';

const STAGE_LABEL: Record<JobStage, string> = {
  preparing: 'Preparing',
  generating: 'Generating',
  finishing: 'Finishing',
};

export function GenerationProgress({
  stage,
  value,
  max,
}: {
  stage?: JobStage;
  value?: number;
  max?: number;
}) {
  const label = stage ? STAGE_LABEL[stage] : 'Starting';
  const showBar =
    typeof value === 'number' && typeof max === 'number' && max > 0;
  const pct = showBar ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}…</p>
      {showBar ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
        </div>
      )}
    </div>
  );
}
