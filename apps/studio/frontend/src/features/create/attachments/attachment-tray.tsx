'use client';

import { Layers, Loader2, Pencil, Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import type { AttachmentStyle } from '../tool-ui';
import { visibleSlotLabels } from './slots';
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

function Thumb({
  item,
  label,
  badge,
  onRemove,
}: {
  item: AttachmentItem;
  label: string;
  badge?: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="group relative size-10 overflow-hidden rounded-lg shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_14%,transparent)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={label}
          className={cn(
            'block size-full object-cover',
            item.uploading && 'opacity-50',
          )}
        />
        {item.uploading ? (
          <Loader2 className="absolute inset-0 m-auto size-4 animate-spin text-foreground" />
        ) : null}
        {badge ? (
          <span
            className={cn(
              'absolute bottom-0.5 left-0.5 min-w-[15px] rounded px-1',
              'bg-black/70 text-center font-mono text-[10px] leading-[15px] font-semibold text-white',
            )}
          >
            {badge}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Remove ${label}`}
          className={cn(
            'absolute inset-0 grid place-items-center border-0 bg-black/55 p-0 text-white',
            'opacity-0 transition-opacity duration-150',
            'group-hover:opacity-100 focus-visible:opacity-100',
          )}
          onClick={onRemove}
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      </div>
      <span className="max-w-[4.5rem] truncate text-[10px] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function AttachmentTray({
  items,
  modeLabel,
  modeHint,
  attachmentStyle = 'numbered',
  slotLabels = [],
  attachDisabled,
  onRemove,
  onClear,
  onAddSlot,
}: {
  items: AttachmentItem[];
  modeLabel?: string;
  modeHint?: string;
  attachmentStyle?: AttachmentStyle;
  slotLabels?: readonly string[];
  attachDisabled?: boolean;
  onRemove: (key: string) => void;
  onClear: () => void;
  onAddSlot?: () => void;
}) {
  const slots = attachmentStyle === 'slots';
  const labels = visibleSlotLabels(slotLabels, items.length);
  if (!slots && items.length === 0) return null;
  if (slots && labels.length === 0 && items.length === 0) return null;

  const combine = !slots && items.length > 1;
  const ModeIcon = combine ? Layers : Pencil;
  const showTray = slots || items.length > 0;
  if (!showTray) return null;

  return (
    <div className="mb-2 flex items-center gap-3 px-1 py-2">
      <div className="flex items-end gap-2">
        {slots
          ? labels.map((label, i) => {
              const item = items[i];
              if (item) {
                return (
                  <Thumb
                    key={item.key}
                    item={item}
                    label={label}
                    onRemove={() => onRemove(item.key)}
                  />
                );
              }
              return (
                <button
                  key={`empty-${label}`}
                  type="button"
                  disabled={attachDisabled}
                  onClick={onAddSlot}
                  aria-label={`Add ${label}`}
                  className={cn(
                    'flex flex-col items-center gap-1 disabled:opacity-40',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-10 place-items-center rounded-lg border border-dashed border-border',
                      'text-muted-foreground transition hover:bg-foreground/[0.04]',
                    )}
                  >
                    <Plus className="size-4" strokeWidth={2} />
                  </span>
                  <span className="max-w-[4.5rem] truncate text-[10px] text-muted-foreground">
                    {label}
                  </span>
                </button>
              );
            })
          : items.map((item, i) => (
              <Thumb
                key={item.key}
                item={item}
                label={`Image ${i + 1}`}
                badge={combine ? String(i + 1) : undefined}
                onRemove={() => onRemove(item.key)}
              />
            ))}
      </div>

      <div className="min-w-0 flex-1 border-l border-border pl-3">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
          <ModeIcon className="size-3.5 text-muted-foreground" strokeWidth={2} />
          {modeLabel ??
            (slots
              ? 'Frames'
              : combine
                ? 'Combine images'
                : 'Edit image')}
        </span>
        {modeHint ? <ModeHint text={modeHint} /> : null}
      </div>

      {items.length > 0 ? (
        <Tooltip content="Clear" side="bottom" align="end">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear attachments"
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-full border-0 bg-transparent',
              'text-danger transition duration-150',
              'hover:bg-danger/10',
            )}
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
        </Tooltip>
      ) : null}
    </div>
  );
}
