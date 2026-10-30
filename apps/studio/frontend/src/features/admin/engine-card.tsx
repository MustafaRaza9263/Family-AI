'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminEngine, usePatchEngine } from './hooks';

export function EngineCard() {
  const engine = useAdminEngine();
  const patch = usePatchEngine();

  if (engine.isLoading) return <Skeleton className="h-28 w-full" />;
  if (engine.isError || !engine.data) {
    return (
      <Card>
        <p className="text-sm text-danger">Could not load engine state.</p>
      </Card>
    );
  }

  const paused = engine.data.paused;

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Engine</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pause stops new jobs from starting. Queued requests wait until resume.
        </p>
      </div>
      <label className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">
          {paused ? 'Paused' : 'Running'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={paused}
          disabled={patch.isPending}
          onClick={() => patch.mutate({ paused: !paused })}
          className={`relative h-7 w-12 rounded-full transition duration-200 ${
            paused ? 'bg-warning' : 'bg-primary'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition duration-200 ${
              paused ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
    </Card>
  );
}
