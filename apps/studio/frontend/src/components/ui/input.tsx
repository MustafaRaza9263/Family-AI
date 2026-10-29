import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm text-foreground shadow-sm transition duration-200 ease-out placeholder:text-muted-foreground focus-visible:border-primary',
        className,
      )}
      {...props}
    />
  );
}
