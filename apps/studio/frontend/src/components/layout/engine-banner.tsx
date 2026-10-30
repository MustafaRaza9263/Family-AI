'use client';

import type { EngineState } from '@studio/shared';

export function EngineBanner({ state }: { state: EngineState | undefined }) {
  if (!state || state === 'ready') return null;

  const message =
    state === 'paused'
      ? 'Generations are paused by an admin. You can still queue requests.'
      : 'The studio engine is unavailable. New generations cannot start yet.';

  return (
    <div
      role="status"
      className="border-b border-border bg-surface-muted px-4 py-2 text-center text-sm text-muted-foreground"
    >
      {message}
    </div>
  );
}
