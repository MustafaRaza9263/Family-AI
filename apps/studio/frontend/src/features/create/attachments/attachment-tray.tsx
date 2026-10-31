'use client';

import { Layers, Loader2, Pencil, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import type { AttachmentItem } from './types';

function ModeHint({ text }: { text: string }) {
  return (
    <>
      <span className="hidden text-xs leading-snug text-muted-foreground sm:block">
        {text}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'block w-full truncate text-left text-xs leading-snug text-muted-foreground sm:hidden',
              'rounded-sm border-0 bg-transparent p-0',
            )}
            aria-label={text}
          >
            {text}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          className="w-auto max-w-[min(18rem,calc(100%-2rem))] rounded-lg px-3 py-2 text-xs leading-snug text-foreground"
        >
          {text}
        </PopoverContent>
      </Popover>
    </>
  );
}

export function AttachmentTray({
  items,
  modeLabel,
  modeHint,
  onRemove,
  onClear,
}: {
  items: AttachmentItem[];
  modeLabel?: string;
  modeHint?: string;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;

  const combine = items.length > 1;
  const ModeIcon = combine ? Layers : Pencil;

  return (
    <div
      className={cn(
        'mb-2 -mx-2.5 -mt-2.5 flex items-center gap-3 rounded-t-[22px]',
        'border-b border-border bg-foreground/[0.02] px-3 py-2.5',
      )}
    >
      <div className="flex items-center gap-1.5">
        {items.map((item, i) => (
          <div
            key={item.key}
            className="group relative size-10 overflow-hidden rounded-lg shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_14%,transparent)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.previewUrl}
              alt={`Image ${i + 1}`}
              className={cn(
                'block size-full object-cover',
                item.uploading && 'opacity-50',
              )}
            />
            {item.uploading ? (
              <Loader2 className="absolute inset-0 m-auto size-4 animate-spin text-foreground" />
            ) : null}
            {combine ? (
              <span
                className={cn(
                  'absolute bottom-0.5 left-0.5 min-w-[15px] rounded px-1',
                  'bg-black/70 text-center font-mono text-[10px] leading-[15px] font-semibold text-white',
                )}
              >
                {i + 1}
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`Remove image ${i + 1}`}
              className={cn(
                'absolute inset-0 grid place-items-center border-0 bg-black/55 p-0 text-white',
                'opacity-0 transition-opacity duration-150',
                'group-hover:opacity-100 focus-visible:opacity-100',
              )}
              onClick={() => onRemove(item.key)}
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      <div className="min-w-0 flex-1 border-l border-border pl-3">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
          <ModeIcon className="size-3.5 text-muted-foreground" strokeWidth={2} />
          {modeLabel ?? (combine ? 'Combine images' : 'Edit image')}
        </span>
        {modeHint ? <ModeHint text={modeHint} /> : null}
      </div>

      <button
        type="button"
        onClick={onClear}
        className={cn(
          'shrink-0 rounded-md border-0 bg-transparent px-2 py-1.5',
          'text-[12.5px] text-muted-foreground transition duration-150',
          'hover:bg-foreground/[0.05] hover:text-foreground',
        )}
      >
        Clear
      </button>
    </div>
  );
}
