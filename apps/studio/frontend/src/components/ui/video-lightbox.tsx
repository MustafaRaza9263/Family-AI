'use client';

import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { assetUrl, downloadAsset } from '@/lib/files';

function GlassButton({
  label,
  onClick,
  danger,
  disabled,
  size = 'md',
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'grid place-items-center rounded-full text-white',
        'border border-white/20 bg-white/15 backdrop-blur-xl',
        'shadow-[0_4px_24px_rgba(0,0,0,0.28)]',
        'transition-[transform,background-color,opacity] duration-150',
        'hover:bg-white/25 active:scale-95',
        'disabled:pointer-events-none disabled:opacity-30',
        danger && 'hover:bg-danger/80',
        size === 'lg' ? 'size-12' : 'size-10',
      )}
    >
      {children}
    </button>
  );
}

export function VideoLightbox({
  assetId,
  posterUrl,
  durationLabel,
  onClose,
  onDelete,
  onUseAsStart,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: {
  assetId: string;
  posterUrl?: string;
  durationLabel?: string | null;
  onClose: () => void;
  onDelete?: () => void;
  onUseAsStart?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  const showNav = Boolean(onPrev || onNext);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Video"
      className="fixed inset-0 z-50 overflow-hidden bg-black/85"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* object-contain so portrait/story videos letterbox instead of cropping */}
        <video
          key={assetId}
          className="max-h-[min(85vh,100%)] max-w-[min(92vw,100%)] rounded-lg object-contain"
          controls
          playsInline
          autoPlay
          loop
          preload="metadata"
          poster={posterUrl}
          src={assetUrl(assetId)}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute top-4 right-4">
          <GlassButton label="Close" onClick={onClose}>
            <X className="size-5" strokeWidth={2} />
          </GlassButton>
        </div>
        {durationLabel ? (
          <span className="absolute top-5 left-5 rounded-md bg-black/65 px-2 py-1 font-mono text-xs text-white">
            {durationLabel}
          </span>
        ) : null}

        {showNav ? (
          <>
            <div className="pointer-events-auto absolute top-1/2 left-3 -translate-y-1/2 sm:left-5">
              <GlassButton
                label="Previous video"
                size="lg"
                disabled={!hasPrev}
                onClick={() => onPrev?.()}
              >
                <ChevronLeft className="size-6" strokeWidth={2} />
              </GlassButton>
            </div>
            <div className="pointer-events-auto absolute top-1/2 right-3 -translate-y-1/2 sm:right-5">
              <GlassButton
                label="Next video"
                size="lg"
                disabled={!hasNext}
                onClick={() => onNext?.()}
              >
                <ChevronRight className="size-6" strokeWidth={2} />
              </GlassButton>
            </div>
          </>
        ) : null}

        <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2.5">
          {onUseAsStart ? (
            <GlassButton label="Use as Start frame" onClick={onUseAsStart}>
              <Clapperboard className="size-5" strokeWidth={2} />
            </GlassButton>
          ) : null}
          <GlassButton
            label="Download"
            onClick={() => {
              void downloadAsset(assetId, 'generation.mp4').catch(() =>
                toast.error('Download failed'),
              );
            }}
          >
            <Download className="size-5" strokeWidth={2} />
          </GlassButton>
          {onDelete ? (
            <GlassButton label="Delete" onClick={onDelete} danger>
              <Trash2 className="size-5" strokeWidth={2} />
            </GlassButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
