"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import type { ImageAttachmentItem } from "@/lib/types";
import { IconButton } from "@/components/ui/IconButton";
import { ZoomableImage } from "./ZoomableImage";

type LightboxProps = {
  items: ImageAttachmentItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

export function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(ZOOM_MIN);
  const item = items[index];

  const goTo = useCallback(
    (next: number) => {
      setScale(ZOOM_MIN);
      onIndexChange(next);
    },
    [onIndexChange],
  );

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goTo(Math.max(0, index - 1));
      if (e.key === "ArrowRight") {
        goTo(Math.min(items.length - 1, index + 1));
      }
      if (e.key === "+" || e.key === "=") {
        setScale((s) => clampZoom(s + ZOOM_STEP));
      }
      if (e.key === "-" || e.key === "_") {
        setScale((s) => clampZoom(s - ZOOM_STEP));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, items.length, onClose, goTo]);

  if (typeof document === "undefined" || !item) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-[70] flex flex-col bg-bg/95 text-text"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{item.title}</p>
          <p className="text-sm text-muted">
            {index + 1} / {items.length}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="Zoom out"
            disabled={scale <= ZOOM_MIN}
            onClick={() => setScale((s) => clampZoom(s - ZOOM_STEP))}
          >
            <Minus className="size-5" />
          </IconButton>
          <IconButton
            label="Zoom in"
            disabled={scale >= ZOOM_MAX}
            onClick={() => setScale((s) => clampZoom(s + ZOOM_STEP))}
          >
            <Plus className="size-5" />
          </IconButton>
          <IconButton ref={closeRef} label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {items.length > 1 ? (
          <>
            <IconButton
              label="Previous image"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeft className="size-6" />
            </IconButton>
            <IconButton
              label="Next image"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2"
              disabled={index === items.length - 1}
              onClick={() => goTo(index + 1)}
            >
              <ChevronRight className="size-6" />
            </IconButton>
          </>
        ) : null}
        <AnimatePresence mode="wait">
          <ZoomableImage
            key={item.id}
            item={item}
            scale={scale}
            onSwipeLeft={() => goTo(Math.min(items.length - 1, index + 1))}
            onSwipeRight={() => goTo(Math.max(0, index - 1))}
          />
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  );
}
