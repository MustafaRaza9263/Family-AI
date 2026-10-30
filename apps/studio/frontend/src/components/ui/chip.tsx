'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Chip({
  active,
  disabled,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition duration-200',
        active
          ? 'border-foreground/30 bg-surface-muted text-foreground'
          : 'border-border bg-surface text-muted-foreground hover:text-foreground',
        disabled && 'opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}
