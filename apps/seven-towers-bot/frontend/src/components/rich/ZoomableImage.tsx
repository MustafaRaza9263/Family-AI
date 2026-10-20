"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion } from "motion/react";
import type { ImageAttachmentItem } from "@/lib/types";
import { spring } from "@/lib/motion";

type ZoomableImageProps = {
  item: ImageAttachmentItem;
  scale: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

type Size = { w: number; h: number };

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
};

/**
 * Zoom changes layout width/height (not CSS transform). Transform scale
 * paints larger without growing the box, so overflow never scrolls and
 * the image is clipped — the bug reported in the lightbox.
 */
export function ZoomableImage({
  item,
  scale,
  onSwipeLeft,
  onSwipeRight,
}: ZoomableImageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [viewport, setViewport] = useState<Size>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = (): void =>
      setViewport({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit =
    natural && viewport.w > 0 && viewport.h > 0
      ? Math.min(viewport.w / natural.w, viewport.h / natural.h)
      : 1;
  const displayW = natural ? natural.w * fit * scale : 0;
  const displayH = natural ? natural.h * fit * scale : 0;
  const zoomed = scale > 1;
  const frameW = Math.max(viewport.w, displayW);
  const frameH = Math.max(viewport.h, displayH);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || displayW <= 0 || displayH <= 0) return;
    el.scrollLeft = Math.max(0, (displayW - el.clientWidth) / 2);
    el.scrollTop = Math.max(0, (displayH - el.clientHeight) / 2);
  }, [scale, displayW, displayH]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const el = viewportRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    const el = viewportRef.current;
    if (!drag || !el || drag.pointerId !== event.pointerId || !zoomed) return;
    el.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    el.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    const el = viewportRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    if (!zoomed) {
      const dx = event.clientX - drag.startX;
      if (dx < -80) onSwipeLeft();
      if (dx > 80) onSwipeRight();
    }
    dragRef.current = null;
  };

  return (
    <motion.div
      ref={viewportRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={spring}
      className="absolute inset-0 overflow-auto overscroll-contain"
      style={{ cursor: zoomed ? "grab" : "default", touchAction: zoomed ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: frameW || "100%", height: frameH || "100%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- relative auth asset URLs */}
        <img
          src={item.url}
          alt={item.title}
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          style={
            displayW > 0 && displayH > 0
              ? {
                  width: displayW,
                  height: displayH,
                  maxWidth: "none",
                  maxHeight: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                }
              : {
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  userSelect: "none",
                  pointerEvents: "none",
                }
          }
        />
      </div>
    </motion.div>
  );
}
