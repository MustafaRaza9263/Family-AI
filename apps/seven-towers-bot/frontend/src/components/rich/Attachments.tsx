"use client";

import type { Attachment } from "@/lib/types";
import { ImageGallery } from "./ImageGallery";

export function Attachments({ items }: { items: Attachment[] }) {
  // Ignore legacy table attachments if any remain in stored messages.
  const images = items.filter((item) => item.type === "images");
  if (images.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {images.map((item, index) => (
        <ImageGallery key={`images-${index}`} attachment={item} />
      ))}
    </div>
  );
}
