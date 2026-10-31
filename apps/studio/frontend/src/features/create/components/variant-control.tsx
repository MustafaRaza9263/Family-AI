'use client';

import type { ToolMode } from '@studio/shared';
import { cn } from '@/lib/cn';
import { resolveIcon } from '@/lib/icons';

type Variant = NonNullable<ToolMode['variant']>;

export function VariantControl({
  variants,
  value,
  onChange,
  disabled,
  disabledTip,
}: {
  variants: Variant[];
  value: string | undefined;
  onChange: (id: string) => void;
  disabled?: boolean;
  disabledTip?: string;
}) {
  if (variants.length <= 1) return null;
  const selected = value ?? variants[0]!.id;

  return (
    <div
      role="radiogroup"
      aria-label="Quality"
      data-tip={disabled ? disabledTip : undefined}
      className="inline-flex h-[34px] items-center gap-0.5 rounded-full border border-border bg-background p-0.5"
    >
      {variants.map((v) => {
        const Icon = resolveIcon(v.icon);
        const on = !disabled && v.id === selected;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={disabled}
            data-tip={v.label}
            aria-label={v.label}
            onClick={() => onChange(v.id)}
            className={cn(
              'inline-flex h-[26px] min-w-7 items-center justify-center rounded-full px-1.5 transition duration-200',
              on
                ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)]'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'cursor-not-allowed opacity-35 hover:text-muted-foreground',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
