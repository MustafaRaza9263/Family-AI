'use client';

import { cn } from '@/lib/cn';

export const HOME_IDEAS = [
  'Cozy café, rainy window',
  'Luxury apartment interior',
  'Retro poster, bold type',
  'Macro dew on a leaf',
  'Aerial city at night',
] as const;

function ChipRow({
  onPick,
  ariaHidden,
}: {
  onPick: (idea: string) => void;
  ariaHidden?: boolean;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 pr-2"
      aria-hidden={ariaHidden || undefined}
    >
      {HOME_IDEAS.map((idea) => (
        <button
          key={idea}
          type="button"
          tabIndex={ariaHidden ? -1 : 0}
          className={cn(
            'h-[30px] shrink-0 rounded-full border border-border bg-surface px-3',
            'text-[12.5px] whitespace-nowrap text-muted-foreground transition duration-200',
            'hover:border-primary/40 hover:text-foreground',
            'hover:shadow-[0_0_18px_-8px_color-mix(in_srgb,var(--primary)_55%,transparent)]',
          )}
          onClick={() => onPick(idea)}
        >
          {idea}
        </button>
      ))}
    </div>
  );
}

export function IdeaChips({
  onPick,
}: {
  onPick: (idea: string) => void;
}) {
  return (
    <div
      className={cn(
        'idea-marquee relative mt-3.5 w-full overflow-hidden',
        '[mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]',
      )}
      aria-label="Sample prompts"
    >
      <div className="idea-marquee-track flex w-max">
        <ChipRow onPick={onPick} />
        <ChipRow onPick={onPick} ariaHidden />
      </div>
    </div>
  );
}
