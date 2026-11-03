'use client';

import {
  Clapperboard,
  ImagePlus,
  Layers,
  Pencil,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/cn';

export type QuickStartAction =
  | 'image'
  | 'video'
  | 'edit'
  | 'animate'
  | 'combine';

type Tile = {
  id: QuickStartAction;
  title: string;
  hint: string;
  icon: LucideIcon;
  key: string;
  color: string;
  videoOnly?: boolean;
};

const TILES: Tile[] = [
  {
    id: 'image',
    title: 'Create image',
    hint: 'Text to image',
    icon: ImagePlus,
    key: 'I',
    color: '#3b82f6',
  },
  {
    id: 'video',
    title: 'Create video',
    hint: 'Text to video',
    icon: Clapperboard,
    key: 'V',
    color: '#a855f7',
    videoOnly: true,
  },
  {
    id: 'edit',
    title: 'Edit a photo',
    hint: 'Change any detail',
    icon: Pencil,
    key: 'E',
    color: '#f59e0b',
  },
  {
    id: 'animate',
    title: 'Animate an image',
    hint: 'Bring a still to life',
    icon: Sparkles,
    key: 'A',
    color: '#ec4899',
    videoOnly: true,
  },
  {
    id: 'combine',
    title: 'Combine images',
    hint: 'Mix 2–4 references',
    icon: Layers,
    key: 'C',
    color: '#14b8a6',
  },
];

export function QuickStartPanel({
  showVideo,
  onAction,
}: {
  showVideo: boolean;
  onAction: (action: QuickStartAction) => void;
}) {
  const tiles = useMemo(
    () => TILES.filter((t) => showVideo || !t.videoOnly),
    [showVideo],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      const tile = tiles.find((t) => t.key.toLowerCase() === e.key.toLowerCase());
      if (!tile) return;
      e.preventDefault();
      onAction(tile.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAction, tiles]);

  return (
    <section
      className="flex h-full min-w-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface p-2.5 shadow-[var(--shadow-soft)]"
      aria-labelledby="home-qs"
    >
      <h2
        id="home-qs"
        className="m-0 mb-1 px-1 text-[11px] font-semibold tracking-tight"
      >
        Quick start
      </h2>

      <div className="flex flex-col gap-px">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              type="button"
              className={cn(
                'group flex w-full items-center rounded-lg px-2 py-1 text-left',
                'transition-[background-color,transform] duration-200',
                'hover:bg-surface-muted active:scale-[0.99]',
              )}
              onClick={() => onAction(tile.id)}
            >
              <span
                className="mr-2 grid size-7 shrink-0 place-items-center"
                style={{ color: tile.color }}
              >
                <Icon className="size-[18px]" strokeWidth={1.9} />
              </span>

              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[11px] font-medium text-foreground">
                  {tile.title}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {tile.hint}
                </span>
              </span>

              <span
                className={cn(
                  'ml-1.5 grid size-4 shrink-0 place-items-center rounded border border-border',
                  'bg-surface-muted font-mono text-[9px] font-semibold text-muted-foreground',
                  'transition-colors duration-200',
                  'group-hover:bg-border/60 group-hover:text-foreground',
                )}
                aria-hidden
              >
                {tile.key}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
