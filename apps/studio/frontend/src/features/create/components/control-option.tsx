'use client';

import type { ModeControl } from '@studio/shared';
import { Chip } from '@/components/ui/chip';
import { Segmented } from '@/components/ui/segmented';
import { cn } from '@/lib/cn';
import { AspectGlyph, resolveIcon } from '@/lib/icons';
import type { ControlValue } from '../control-state';

function looksLikeAspect(value: string): boolean {
  return /^\d+:\d+$/.test(value);
}

function aspectName(label: string, value: string): string {
  const stripped = label.replace(value, '').trim();
  return stripped || label;
}

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

  const isAspect = control.options.every((opt) => looksLikeAspect(opt.value));

  if (isAspect) {
    return (
      <div
        role="radiogroup"
        aria-label={control.label}
        className="grid w-full min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4"
      >
        {control.options.map((opt) => {
          const active = String(value) === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1 rounded-[var(--radius-control)] border px-2 py-2 text-center transition duration-200',
                active
                  ? 'border-border bg-surface-muted text-foreground'
                  : 'border-transparent bg-surface-muted/50 text-muted-foreground hover:text-foreground',
              )}
            >
              <AspectGlyph value={opt.value} />
              <span className="w-full truncate text-xs font-medium leading-tight">
                {aspectName(opt.label, opt.value)}
              </span>
              <span className="text-[10px] leading-none text-muted-foreground">
                {opt.value}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const options = control.options.map((opt) => {
    const Icon = resolveIcon(opt.icon);
    return {
      value: opt.value,
      label: opt.label,
      icon: <Icon className="size-3.5" />,
    };
  });

  if (options.length <= 4) {
    return (
      <Segmented
        aria-label={control.label}
        value={String(value)}
        options={options}
        onChange={onChange}
        className="w-full min-w-0 max-w-full"
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={control.label}>
      {options.map((opt) => (
        <Chip
          key={opt.value}
          active={String(value) === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon}
          {opt.label}
        </Chip>
      ))}
    </div>
  );
}
