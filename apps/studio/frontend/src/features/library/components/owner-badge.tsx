'use client';

import type { AssetOwner } from '@studio/shared';
import { useState, type MouseEvent } from 'react';
import { Avatar } from '@/components/ui/avatar';
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/cn';

/**
 * Admin-only creator chip on a library tile.
 * Visible on hover (always on touch); click opens a tiny name + email popover.
 */
export function OwnerBadge({ owner }: { owner: AssetOwner }) {
  const [open, setOpen] = useState(false);

  const stopTile = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Creator: ${owner.fullName}`}
          aria-expanded={open}
          onClick={stopTile}
          onPointerDown={stopTile}
          className={cn(
            'absolute bottom-2.5 left-2.5 z-10',
            'rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.35)]',
            'transition-[opacity,transform] duration-150',
            'hover:scale-105 active:scale-95',
            // Always on mobile; hover/focus only on desktop (matches other overlays).
            'opacity-100',
            'md:pointer-events-none md:opacity-0',
            'md:group-hover:pointer-events-auto md:group-hover:opacity-100',
            'md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100',
            open && 'md:pointer-events-auto md:opacity-100',
          )}
        >
          <Avatar name={owner.fullName} className="size-6 text-[9px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-auto max-w-[10rem] rounded-md px-1.5 py-1"
        onClick={stopTile}
        onPointerDown={stopTile}
      >
        <div className="flex items-center gap-1">
          <Avatar
            name={owner.fullName}
            className="size-5 shrink-0 text-[8px]"
          />
          <div className="min-w-0">
            <p className="truncate text-[10px] leading-tight font-semibold text-foreground">
              {owner.fullName}
            </p>
            <p className="mt-px truncate text-[9px] leading-tight text-muted-foreground">
              {owner.email}
            </p>
          </div>
        </div>
        <PopoverArrow
          width={8}
          height={4}
          className="fill-surface drop-shadow-[0_1px_0_var(--color-border)]"
        />
      </PopoverContent>
    </Popover>
  );
}
