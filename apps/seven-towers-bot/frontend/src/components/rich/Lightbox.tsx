"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ImageAttachmentItem } from "@/lib/types";
import { IconButton } from "@/components/ui/IconButton";
import { ZoomableImage } from "./ZoomableImage";

type LightboxProps = {
  items: ImageAttachmentItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index];

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange(Math.max(0, index - 1));
      if (e.key === "ArrowRight") {
        onIndexChange(Math.min(items.length - 1, index + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndexChange]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      className="fixed inset-0 z-[60] flex flex-col bg-bg/95 text-text"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted">
            {index + 1} / {items.length}
          </p>
        </div>
        <IconButton ref={closeRef} label="Close" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
        {items.length > 1 ? (
          <>
            <IconButton
              label="Previous image"
              className="absolute left-2"
              disabled={index === 0}
              onClick={() => onIndexChange(index - 1)}
            >
              <ChevronLeft className="size-6" />
            </IconButton>
            <IconButton
              label="Next image"
              className="absolute right-2"
              disabled={index === items.length - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              <ChevronRight className="size-6" />
            </IconButton>
          </>
        ) : null}
        <AnimatePresence mode="wait">
          <ZoomableImage
            key={item.id}
            item={item}
            onSwipeLeft={() =>
              onIndexChange(Math.min(items.length - 1, index + 1))
            }
            onSwipeRight={() => onIndexChange(Math.max(0, index - 1))}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
