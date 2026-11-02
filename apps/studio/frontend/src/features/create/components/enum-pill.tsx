'use client';

import type { ModeControl } from '@studio/shared';
import { cn } from '@/lib/cn';
import { resolveIcon } from '@/lib/icons';
import type { ControlValue } from '../control-state';

/** Inline enum control for the composer bar (quality, duration, etc.). */
export function EnumPill({
  control,
  value,
  onChange,
}: {
  control: ModeControl;
  value: ControlValue;
  onChange: (value: ControlValue) => void;
}) {
  if (control.type !== 'enum' || !control.options?.length) return null;
  const selected = String(value);

  return (
    <div
      role="radiogroup"
      aria-label={control.label}
      className="inline-flex h-[34px] items-center gap-0.5 rounded-full border border-border bg-background p-0.5"
    >
      {control.options.map((opt) => {
        const Icon = resolveIcon(opt.icon);
        const on = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-tip={opt.label}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-[26px] min-w-7 items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-semibold transition duration-200',
              on
                ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden max-w-14 truncate sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
