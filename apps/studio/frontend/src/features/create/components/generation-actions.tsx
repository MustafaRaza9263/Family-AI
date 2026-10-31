'use client';

import {
  Copy,
  Download,
  ImagePlus,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { downloadAsset } from '@/lib/files';

function IconAction({
  label,
  onClick,
  children,
  danger,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid size-[30px] shrink-0 place-items-center rounded-full',
        'text-muted-foreground transition duration-200',
        'hover:bg-foreground/5 hover:text-foreground disabled:opacity-40',
        primary &&
          'hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_14px_-4px_color-mix(in_srgb,var(--primary)_80%,transparent)]',
        danger &&
          'hover:bg-danger/10 hover:text-danger hover:shadow-[0_0_14px_-4px_color-mix(in_srgb,var(--danger)_70%,transparent)]',
      )}
    >
      {children}
    </button>
  );
}

export function GenerationActions({
  assetId,
  prompt,
  took,
  canAddReference,
  onEdit,
  onAddReference,
  onRegenerate,
  onDelete,
}: {
  assetId?: string;
  prompt: string;
  took?: string | null;
  canAddReference: boolean;
  onEdit: () => void;
  onAddReference: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-0.5">
      <IconAction label="Edit this image" onClick={onEdit} disabled={!assetId} primary>
        <Pencil className="size-4" />
      </IconAction>
      <IconAction
        label="Add as reference"
        onClick={onAddReference}
        disabled={!assetId || !canAddReference}
        primary
      >
        <ImagePlus className="size-4" />
      </IconAction>
      {assetId ? (
        <IconAction
          label="Download"
          onClick={() => {
            void downloadAsset(assetId).catch(() =>
              toast.error('Download failed'),
            );
          }}
        >
          <Download className="size-4" />
        </IconAction>
      ) : null}
      <IconAction label="Run again" onClick={onRegenerate}>
        <RefreshCw className="size-4" />
      </IconAction>
      <IconAction
        label="Copy prompt"
        onClick={() => {
          void navigator.clipboard.writeText(prompt).then(
            () => toast.success('Prompt copied'),
            () => toast.error('Could not copy'),
          );
        }}
      >
        <Copy className="size-4" />
      </IconAction>
      <span className="flex-1" />
      {took ? (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {took}
        </span>
      ) : null}
      <IconAction label="Delete" onClick={onDelete} danger>
        <Trash2 className="size-4" />
      </IconAction>
    </div>
  );
}
