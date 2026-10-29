'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: 'border border-border bg-surface text-foreground',
      }}
    />
  );
}
