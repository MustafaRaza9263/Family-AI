'use client';

import type { AssetDto, UserJob } from '@studio/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lightbox } from '@/components/ui/lightbox';
import { jobLiveKey, type JobLiveState } from '@/features/events/job-live';
import { errorMessage } from '@/lib/errors';
import { assetUrl } from '@/lib/files';
import { cn } from '@/lib/cn';
import { MEDIA_MAX_H, mediaWidthFromAspect } from '../media-size';
import { GenerationActions } from './generation-actions';
import { GenerationProgress } from './generation-progress';
import { LightMatrixCanvas } from './light-matrix-canvas';

export function GenerationCard({
  job,
  assets,
  onCancel,
  onRegenerate,
  onDelete,
}: {
  job: UserJob;
  assets: AssetDto[];
  onCancel: () => void;
  onRegenerate: () => void;
  onDelete: (assetId: string) => void;
}) {
  const { data: live } = useQuery<JobLiveState>({
    queryKey: jobLiveKey(job.id),
    queryFn: () => ({}),
    staleTime: Infinity,
    enabled: job.status === 'queued' || job.status === 'running',
  });
  const [open, setOpen] = useState(false);
  const asset = assets[0] ?? null;
  const assetId = asset?.id ?? job.outputAssetIds[0];
  const fullSrc = assetId ? assetUrl(assetId) : null;
  const thumbSrc = assetId ? assetUrl(assetId, { thumb: true }) : null;
  const hasImage = job.status === 'done' && Boolean(fullSrc);
  const pending = job.status === 'queued' || job.status === 'running';
  const aspect =
    typeof job.params.aspectRatio === 'string'
      ? job.params.aspectRatio
      : '1:1';

  // Aspect-driven width shared by matrix + image — avoids swap jerk.
  const mediaW = mediaWidthFromAspect(aspect);
  const sized = hasImage || pending;

  return (
    <Card
      className={cn(
        'space-y-3 p-4',
        sized ? 'w-fit max-w-full' : 'w-full max-w-xl',
      )}
    >
      <div
        className="space-y-3"
        style={
          sized ? { width: mediaW, maxWidth: '100%' } : undefined
        }
      >
        <p className="text-sm break-words whitespace-pre-wrap text-foreground">
          {job.prompt}
        </p>

        {pending ? (
          <div className="space-y-2">
            <LightMatrixCanvas
              aspectRatio={aspect}
              width={mediaW}
              label={
                job.status === 'queued'
                  ? `Queued${live?.position ? `, position ${live.position}` : ''}`
                  : 'Generating'
              }
            />
            {job.status === 'queued' ? (
              <p className="text-sm text-muted-foreground">
                Queued{live?.position ? ` · position ${live.position}` : ''}
              </p>
            ) : (
              <GenerationProgress
                stage={live?.stage}
                value={live?.progressValue}
                max={live?.progressMax}
              />
            )}
          </div>
        ) : null}

        {hasImage && fullSrc ? (
          <button
            type="button"
            className="block w-full overflow-hidden rounded-[var(--radius-control)] bg-surface-muted"
            style={{ aspectRatio: aspect.replace(':', ' / ') }}
            onClick={() => setOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSrc ?? fullSrc}
              alt=""
              width={mediaW}
              height={MEDIA_MAX_H}
              className="block size-full object-cover"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (thumbSrc && img.src.includes('thumb=1')) {
                  img.src = fullSrc;
                }
              }}
            />
          </button>
        ) : null}

        {job.status === 'failed' ? (
          <div className="space-y-2">
            <p className="text-sm text-danger">{errorMessage(job.errorCode)}</p>
            <Button type="button" size="sm" onClick={onRegenerate}>
              Try again
            </Button>
          </div>
        ) : null}

        {job.status === 'cancelled' ? (
          <p className="text-sm text-muted-foreground">Cancelled</p>
        ) : null}

        {pending ? (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}

        {job.status === 'done' ? (
          <GenerationActions
            assetId={assetId}
            prompt={job.prompt}
            onRegenerate={onRegenerate}
            onDelete={() => assetId && onDelete(assetId)}
          />
        ) : null}
      </div>

      {open && fullSrc ? (
        <Lightbox
          src={fullSrc}
          alt={job.prompt}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Card>
  );
}
