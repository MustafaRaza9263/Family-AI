'use client';

import type { ModeControl } from '@studio/shared';
import { cn } from '@/lib/cn';
import { resolveIcon } from '@/lib/icons';
import type { ControlValue } from '../control-state';

/** Compact enum control for settings popovers (non-aspect). */
export function ControlOption({
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
      className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-background p-0.5"
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
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition duration-200',
              on
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
