'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'border border-border shadow-[var(--shadow-soft)]',
          title: 'text-sm font-medium',
          description: 'text-sm text-muted-foreground',
          closeButton: 'border border-border bg-surface text-foreground',
        },
      }}
    />
  );
}
