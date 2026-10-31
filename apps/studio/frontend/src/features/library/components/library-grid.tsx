'use client';

import type { AssetDto } from '@studio/shared';
import { Check, Pencil, Trash2 } from 'lucide-react';
import {
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { assetUrl } from '@/lib/files';

const MASONRY =
  'columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6';

const LONG_PRESS_MS = 480;

function OverlayIcon({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'grid size-9 place-items-center rounded-full text-white',
        'shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-sm',
        'transition-[transform,background-color] duration-150',
        'hover:scale-105 active:scale-95',
        danger
          ? 'bg-danger/95 hover:bg-danger'
          : 'bg-[color-mix(in_srgb,#3d5a66_82%,transparent)] hover:bg-[color-mix(in_srgb,#3d5a66_95%,transparent)]',
      )}
    >
      {children}
    </button>
  );
}

function SelectCheckbox({
  selected,
  visible,
  hoverReveal,
  onToggle,
}: {
  selected: boolean;
  visible: boolean;
  /** Desktop: show on tile hover when not otherwise visible. */
  hoverReveal?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={selected ? 'Deselect image' : 'Select image'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'absolute top-2.5 left-2.5 z-10 grid size-7 place-items-center rounded-full',
        'border-2 shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-[opacity,transform,background-color] duration-150',
        'hover:scale-105 active:scale-95',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-white/90 bg-black/40 text-transparent',
        visible
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0',
        hoverReveal &&
          'md:group-hover:pointer-events-auto md:group-hover:opacity-100',
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </button>
  );
}

function LibraryTile({
  asset,
  selected,
  selectionActive,
  onOpen,
  onEdit,
  onDelete,
  onToggleSelect,
}: {
  asset: AssetDto;
  selected: boolean;
  selectionActive: boolean;
  onOpen: (asset: AssetDto) => void;
  onEdit: (asset: AssetDto) => void;
  onDelete: (asset: AssetDto) => void;
  onToggleSelect: (asset: AssetDto) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const selectable = asset.kind === 'image';

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!selectable || e.button !== 0) return;
    longPressedRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      onToggleSelect(asset);
      // Haptic where available (mobile).
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(12);
      }
    }, LONG_PRESS_MS);
  };

  const onPointerUp = () => clearTimer();
  const onPointerCancel = () => clearTimer();

  return (
    <div
      className={cn(
        'group relative mb-3 w-full break-inside-avoid overflow-hidden rounded-2xl',
        'bg-surface-muted',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
      style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={clearTimer}
      onContextMenu={(e) => {
        if (selectable) e.preventDefault();
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (longPressedRef.current) {
            longPressedRef.current = false;
            return;
          }
          // Once selecting on touch, tap toggles instead of opening.
          if (selectionActive && selectable) {
            onToggleSelect(asset);
            return;
          }
          onOpen(asset);
        }}
        className="absolute inset-0 block size-full border-0 bg-transparent p-0"
        aria-label="View"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assetUrl(asset.id, { thumb: true })}
          alt=""
          width={asset.width}
          height={asset.height}
          className="block size-full object-cover"
          loading="lazy"
          draggable={false}
        />
      </button>

      {selectable ? (
        <SelectCheckbox
          selected={selected}
          visible={selected || selectionActive}
          onToggle={() => onToggleSelect(asset)}
          hoverReveal={!selected && !selectionActive}
        />
      ) : null}

      <div
        className={cn(
          'absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5',
          'pointer-events-auto opacity-100 transition-opacity duration-200',
          'md:pointer-events-none md:opacity-0',
          'md:group-hover:pointer-events-auto md:group-hover:opacity-100',
          'md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100',
        )}
      >
        {asset.kind === 'image' ? (
          <OverlayIcon
            label="Edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(asset);
            }}
          >
            <Pencil className="size-4" strokeWidth={2} />
          </OverlayIcon>
        ) : null}
        <OverlayIcon
          label="Delete"
          danger
          onClick={(e) => {
            e.stopPropagation();
            onDelete(asset);
          }}
        >
          <Trash2 className="size-4" strokeWidth={2} />
        </OverlayIcon>
      </div>
    </div>
  );
}

export function LibraryGrid({
  items,
  hasMore,
  loadingMore,
  selectedIds,
  onLoadMore,
  onOpen,
  onEdit,
  onDelete,
  onToggleSelect,
}: {
  items: AssetDto[];
  hasMore: boolean;
  loadingMore: boolean;
  selectedIds: Set<string>;
  onLoadMore: () => void;
  onOpen: (asset: AssetDto) => void;
  onEdit: (asset: AssetDto) => void;
  onDelete: (asset: AssetDto) => void;
  onToggleSelect: (asset: AssetDto) => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const selectionActive = selectedIds.size > 0;

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
    <div>
      <div className={MASONRY}>
        {items.map((asset) => (
          <LibraryTile
            key={asset.id}
            asset={asset}
            selected={selectedIds.has(asset.id)}
            selectionActive={selectionActive}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleSelect={onToggleSelect}
          />
        ))}
        {loadingMore
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="mb-3 break-inside-avoid"
                style={{ aspectRatio: i % 2 === 0 ? '3 / 4' : '4 / 3' }}
              >
                <Skeleton className="size-full rounded-2xl" />
              </div>
            ))
          : null}
      </div>
      <div ref={sentinel} className="h-1" />
    </div>
  );
}

const SKELETON_RATIOS = ['3 / 4', '1 / 1', '4 / 3', '9 / 16', '16 / 9'] as const;

export function LibraryGridSkeleton() {
  return (
    <div className={MASONRY}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="mb-3 break-inside-avoid"
          style={{ aspectRatio: SKELETON_RATIOS[i % SKELETON_RATIOS.length] }}
        >
          <Skeleton className="size-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
