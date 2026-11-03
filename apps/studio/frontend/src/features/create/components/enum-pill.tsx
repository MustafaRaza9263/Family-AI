'use client';

import type { ModeControl } from '@studio/shared';
import { cn } from '@/lib/cn';
import { resolveIcon } from '@/lib/icons';
import type { ControlValue } from '../control-state';

function isDurationControl(control: ModeControl): boolean {
  if (control.id === 'duration') return true;
  const opts = control.options;
  if (!opts?.length) return false;
  return opts.every(
    (o) => /^\d+\s*s$/i.test(o.label) || /^\d+$/.test(o.value),
  );
}

function compactSeconds(label: string, value: string): string {
  const fromLabel = label.match(/(\d+)\s*s/i);
  if (fromLabel) return `${fromLabel[1]}s`;
  if (/^\d+$/.test(value)) return `${value}s`;
  return label.replace(/\s+/g, '');
}

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
  const options = control.options;
  const duration = isDurationControl(control);

  const cycle = () => {
    const i = options.findIndex((o) => o.value === selected);
    const next = options[(i + 1) % options.length] ?? options[0]!;
    onChange(next.value);
  };

  const selectedOpt =
    options.find((o) => o.value === selected) ?? options[0]!;
  const secondsLabel = compactSeconds(selectedOpt.label, selectedOpt.value);

  return (
    <>
      {duration ? (
        <button
          type="button"
          aria-label={`${control.label}: ${secondsLabel}. Tap to change.`}
          data-tip={`${control.label} · ${secondsLabel}`}
          onClick={cycle}
          className={cn(
            'inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-full border border-border',
            'bg-background px-2 text-[12px] font-semibold tabular-nums text-foreground',
            'transition duration-200 hover:bg-surface-muted sm:hidden',
          )}
        >
          {secondsLabel}
        </button>
      ) : null}

      <div
        role="radiogroup"
        aria-label={control.label}
        className={cn(
          'h-[34px] items-center gap-0.5 rounded-full border border-border bg-background p-0.5',
          duration ? 'hidden sm:inline-flex' : 'inline-flex',
        )}
      >
        {options.map((opt) => {
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
              <span className="hidden max-w-14 truncate sm:inline">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
