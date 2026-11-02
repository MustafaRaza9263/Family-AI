'use client';

import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

type Pan = { x: number; y: number };

function clampPan(
  pan: Pan,
  zoom: number,
  stageW: number,
  stageH: number,
  imgW: number,
  imgH: number,
): Pan {
  if (zoom <= ZOOM_MIN || imgW <= 0 || imgH <= 0) return { x: 0, y: 0 };
  const scaledW = imgW * zoom;
  const scaledH = imgH * zoom;
  // How far the image may move before an empty edge shows.
  const maxX = Math.max(0, (scaledW - stageW) / 2);
  const maxY = Math.max(0, (scaledH - stageH) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

function GlassButton({
  label,
  onClick,
  disabled,
  size = 'md',
  children,
}: {
  label: string;
  onClick: () => void;
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
        size === 'lg' ? 'size-12' : 'size-10',
      )}
    >
      {children}
    </button>
  );
}

export function Lightbox({
  src,
  alt,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: {
  src: string;
  alt: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [zoomForSrc, setZoomForSrc] = useState(src);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const sizeRef = useRef({ stageW: 0, stageH: 0, imgW: 0, imgH: 0 });
  const panRef = useRef(pan);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  // After a pan, the browser still fires click on release — ignore that one.
  const suppressClickRef = useRef(false);

  // Reset when the image changes.
  if (src !== zoomForSrc) {
    setZoomForSrc(src);
    setZoom(ZOOM_MIN);
    setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img) return sizeRef.current;
    const next = {
      stageW: stage.clientWidth,
      stageH: stage.clientHeight,
      imgW: img.offsetWidth,
      imgH: img.offsetHeight,
    };
    sizeRef.current = next;
    return next;
  }, []);

  const reclamp = useCallback((nextZoom: number, nextPan?: Pan) => {
    const { stageW, stageH, imgW, imgH } = measure();
    setPan(
      clampPan(
        nextPan ?? panRef.current,
        nextZoom,
        stageW,
        stageH,
        imgW,
        imgH,
      ),
    );
  }, [measure]);

  useLayoutEffect(() => {
    reclamp(zoom);
  }, [zoom, src, reclamp]);

  useEffect(() => {
    const onResize = () => reclamp(zoom);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [zoom, reclamp]);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10);
      // Keep current pan, then layout effect reclamps to new zoom.
      return next;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10);
      if (next <= ZOOM_MIN) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-' || e.key === '_') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, hasPrev, hasNext, zoomIn, zoomOut]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || zoom <= ZOOM_MIN) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    const { stageW, stageH, imgW, imgH } = sizeRef.current;
    setPan(
      clampPan(
        { x: drag.originX + dx, y: drag.originY + dy },
        zoom,
        stageW,
        stageH,
        imgW,
        imgH,
      ),
    );
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.moved) suppressClickRef.current = true;
    dragRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
  };

  const canZoomOut = zoom > ZOOM_MIN;
  const canZoomIn = zoom < ZOOM_MAX;
  const canGrab = zoom > ZOOM_MIN;
  // Always show nav chrome when handlers are wired (disabled at ends).
  const showNav = Boolean(onPrev || onNext);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={alt}
      className="fixed inset-0 z-50 overflow-hidden bg-black/85"
    >
      {/* Image stage fills the viewport; overflow clips so nothing escapes. */}
      <div
        ref={stageRef}
        className={cn(
          'absolute inset-0 flex items-center justify-center overflow-hidden',
          canGrab && (dragging ? 'cursor-grabbing' : 'cursor-grab'),
        )}
        onClick={(e) => {
          // Pan release often lands as a click on the empty stage — don't close.
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          // Click empty stage (not the image) closes.
          if (e.target === e.currentTarget) onClose();
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="max-h-[min(90vh,100%)] max-w-[min(92vw,100%)] origin-center object-contain select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: dragging ? 'none' : 'transform 200ms ease-out',
          }}
          draggable={false}
          onLoad={() => reclamp(zoom)}
        />
      </div>

      {/* Controls sit above the stage so a zoomed image never covers them. */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute top-4 right-4">
          <GlassButton label="Close" onClick={onClose}>
            <X className="size-5" strokeWidth={2} />
          </GlassButton>
        </div>

        {showNav ? (
          <>
            <div className="pointer-events-auto absolute top-1/2 left-3 -translate-y-1/2 sm:left-5">
              <GlassButton
                label="Previous image"
                size="lg"
                disabled={!hasPrev}
                onClick={() => onPrev?.()}
              >
                <ChevronLeft className="size-6" strokeWidth={2} />
              </GlassButton>
            </div>
            <div className="pointer-events-auto absolute top-1/2 right-3 -translate-y-1/2 sm:right-5">
              <GlassButton
                label="Next image"
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
          <GlassButton
            label="Zoom out"
            disabled={!canZoomOut}
            onClick={zoomOut}
          >
            <Minus className="size-5" strokeWidth={2.25} />
          </GlassButton>
          <GlassButton label="Zoom in" disabled={!canZoomIn} onClick={zoomIn}>
            <Plus className="size-5" strokeWidth={2.25} />
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
