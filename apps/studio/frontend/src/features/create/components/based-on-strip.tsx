'use client';

import { assetUrl } from '@/lib/files';

export function BasedOnStrip({ assetIds }: { assetIds: string[] }) {
  if (assetIds.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Based on</span>
      <div className="flex gap-1">
        {assetIds.map((id, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={id}
            src={assetUrl(id, { thumb: true })}
            alt={`Input ${i + 1}`}
            className="size-8 rounded border border-border object-cover"
          />
        ))}
      </div>
    </div>
  );
}
