'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SegmentedOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export function Segmented({
  value,
  options,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full min-w-0 rounded-[var(--radius-control)] border border-border bg-surface-muted p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 py-1.5 text-sm font-medium transition duration-200',
              active
                ? 'bg-surface text-foreground'
                : 'text-muted-foreground hover:text-foreground',
              opt.disabled && 'opacity-40',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
