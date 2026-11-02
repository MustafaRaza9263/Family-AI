'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Top-right glass chip: previous / count / next for regenerate versions. */
export function VersionSwitcher({
  view,
  total,
  live,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  view: number;
  total: number;
  live?: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total < 2) return null;
  return (
    <div
      className={cn(
        'absolute top-2.5 right-2.5 z-10 flex items-center gap-0 rounded-full p-0.5',
        'border border-white/14 bg-[rgba(8,10,14,0.55)] backdrop-blur-md',
      )}
    >
      <button
        type="button"
        data-tip={canPrev ? 'Previous version' : undefined}
        data-tip-side="below"
        aria-label="Previous version"
        disabled={!canPrev}
        onClick={onPrev}
        className={cn(
          'grid size-[22px] place-items-center rounded-full text-muted-foreground',
          'transition duration-200 hover:bg-primary/12 hover:text-primary',
          'disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground',
        )}
      >
        <ChevronLeft className="size-3.5" strokeWidth={2} />
      </button>
      <span
        className={cn(
          'min-w-[26px] text-center font-mono text-[11px] font-semibold tracking-wide',
          live ? 'text-primary [text-shadow:0_0_8px_color-mix(in_srgb,var(--primary)_80%,transparent)]' : 'text-foreground',
        )}
        aria-live="polite"
      >
        {view + 1}/{total}
      </span>
      <button
        type="button"
        data-tip={canNext ? 'Next version' : undefined}
        data-tip-side="below"
        data-tip-align="end"
        aria-label="Next version"
        disabled={!canNext}
        onClick={onNext}
        className={cn(
          'grid size-[22px] place-items-center rounded-full text-muted-foreground',
          'transition duration-200 hover:bg-primary/12 hover:text-primary',
          'disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground',
        )}
      >
        <ChevronRight className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
