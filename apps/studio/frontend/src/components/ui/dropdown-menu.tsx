'use client';

import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenu({
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return (
    <DropdownMenuPrimitive.Root {...props}>{children}</DropdownMenuPrimitive.Root>
  );
}

export function DropdownMenuContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  children: ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={8}
        className={cn(
          'z-50 min-w-48 rounded-[var(--radius-control)] border border-border bg-surface p-1 shadow-[var(--shadow-soft)]',
          className,
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-surface-muted',
        className,
      )}
      {...props}
    />
  );
}
