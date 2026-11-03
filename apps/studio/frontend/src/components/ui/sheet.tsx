'use client';

/**
 * Right-side slide-in sheet using Radix Dialog.
 * Positioned: fixed inset-y-0 right-0, full-screen on mobile, max-w-lg on desktop.
 * Esc closes (Radix default).
 */
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { children: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          // Full screen mobile, slide-panel on desktop
          'fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-surface shadow-2xl',
          'sm:max-w-lg sm:border-l sm:border-border',
          // Radix data-state animations
          'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full',
          'duration-300 ease-out',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-start justify-between gap-2',
        'border-b border-border bg-surface px-5 py-4',
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-base font-semibold leading-snug', className)}
      {...props}
    />
  );
}

/** Standard close button for the sheet header. */
export function SheetCloseButton({ label = 'Close' }: { label?: string }) {
  return (
    <DialogPrimitive.Close
      aria-label={label}
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
    >
      <X className="size-4" strokeWidth={2.5} />
    </DialogPrimitive.Close>
  );
}
