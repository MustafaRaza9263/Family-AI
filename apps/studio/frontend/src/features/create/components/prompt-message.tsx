'use client';

import { Copy, Pencil } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Lightbox } from '@/components/ui/lightbox';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { assetUrl } from '@/lib/files';

function PromptIconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
          'text-muted-foreground transition duration-200',
          'hover:bg-surface-muted hover:text-foreground',
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/** Right-aligned user prompt: optional input thumbs, bubble, hover copy/edit. */
export function PromptMessage({
  prompt,
  inputAssetIds,
  onEdit,
}: {
  prompt: string;
  inputAssetIds: string[];
  onEdit: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="group/prompt flex w-full flex-col items-end gap-2">
      {inputAssetIds.length > 0 ? (
        <div className="flex max-w-[min(100%,28rem)] flex-wrap justify-end gap-1.5">
          {inputAssetIds.map((id, i) => (
            <button
              key={id}
              type="button"
              aria-label={`View selected ${i + 1}`}
              onClick={() => setOpenId(id)}
              className="overflow-hidden rounded-xl p-0 transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(id, { thumb: true })}
                alt={`Selected ${i + 1}`}
                className="size-14 object-cover sm:size-16"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="max-w-[min(100%,28rem)]">
        <div className="rounded-[22px] bg-[#2b3a55] px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-white">
          {prompt}
        </div>

        {/* Height always reserved — opacity only, so hover never shifts layout */}
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-0.5',
            'opacity-0 transition-opacity duration-150',
            'pointer-events-none group-hover/prompt:pointer-events-auto',
            'group-hover/prompt:opacity-100 group-focus-within/prompt:opacity-100',
            'group-focus-within/prompt:pointer-events-auto',
          )}
        >
          <PromptIconAction
            label="Copy prompt"
            onClick={() => {
              void navigator.clipboard.writeText(prompt).then(
                () => toast.success('Prompt copied'),
                () => toast.error('Could not copy'),
              );
            }}
          >
            <Copy className="size-4" />
          </PromptIconAction>
          <PromptIconAction label="Edit prompt" onClick={onEdit}>
            <Pencil className="size-4" />
          </PromptIconAction>
        </div>
      </div>

      {openId ? (
        <Lightbox
          src={assetUrl(openId)}
          alt={`Selected image`}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}
