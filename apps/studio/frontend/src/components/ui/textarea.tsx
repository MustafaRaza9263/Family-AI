import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full resize-y rounded-[var(--radius-control)] border border-border bg-composer px-3 py-2.5 text-sm text-foreground transition duration-200 placeholder:text-muted-foreground focus-visible:border-foreground/40',
        className,
      )}
      {...props}
    />
  );
}
