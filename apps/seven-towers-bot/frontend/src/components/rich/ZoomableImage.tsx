"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { ImageAttachmentItem } from "@/lib/types";
import { spring } from "@/lib/motion";

type ZoomableImageProps = {
  item: ImageAttachmentItem;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

export function ZoomableImage({
  item,
  onSwipeLeft,
  onSwipeRight,
}: ZoomableImageProps) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <motion.img
      src={item.url}
      alt={item.title}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -80) onSwipeLeft();
        if (info.offset.x > 80) onSwipeRight();
      }}
      onClick={() => setZoomed((z) => !z)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: zoomed ? 1.4 : 1 }}
      exit={{ opacity: 0 }}
      transition={spring}
      className="max-h-full max-w-full cursor-zoom-in object-contain"
    />
  );
}
