'use client';

import { Copy, Download, RefreshCw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/tooltip';
import { downloadAsset } from '@/lib/files';
import { cn } from '@/lib/cn';

function IconAction({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition duration-200',
          'hover:bg-surface-muted hover:text-foreground',
          danger && 'hover:text-danger',
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function GenerationActions({
  assetId,
  prompt,
  onRegenerate,
  onDelete,
}: {
  assetId?: string;
  prompt: string;
  onRegenerate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-0.5">
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
      <IconAction label="Regenerate" onClick={onRegenerate}>
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
      <IconAction label="Delete" onClick={onDelete} danger>
        <Trash2 className="size-4" />
      </IconAction>
    </div>
  );
}
