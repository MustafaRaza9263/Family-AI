'use client';

import type { AssetDto } from '@studio/shared';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { assetUrl } from '@/lib/files';

export function LibraryGrid({
  items,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
}: {
  items: AssetDto[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onOpen: (asset: AssetDto) => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onLoadMore();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((asset) => (
        <button
          key={asset.id}
          type="button"
          onClick={() => onOpen(asset)}
          className="aspect-square overflow-hidden rounded-[var(--radius-control)] border border-border bg-surface-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(asset.id, { thumb: true })}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        </button>
      ))}
      {loadingMore
        ? Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))
        : null}
      <div ref={sentinel} className="col-span-full h-1" />
    </div>
  );
}
