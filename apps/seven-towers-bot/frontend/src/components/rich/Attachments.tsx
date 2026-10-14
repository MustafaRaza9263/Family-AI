"use client";

import type { Attachment } from "@/lib/types";
import { DataTable } from "./DataTable";
import { ImageGallery } from "./ImageGallery";

export function Attachments({ items }: { items: Attachment[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {items.map((item, index) => {
        if (item.type === "images") {
          return <ImageGallery key={`images-${index}`} attachment={item} />;
        }
        return <DataTable key={item.id} attachment={item} />;
      })}
    </div>
  );
}
