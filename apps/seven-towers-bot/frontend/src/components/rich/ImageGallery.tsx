"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ImageAttachment } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { Lightbox } from "./Lightbox";

export function ImageGallery({ attachment }: { attachment: ImageAttachment }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = attachment.items.length;
  const grid =
    count === 1
      ? "grid-cols-1"
      : count <= 4
        ? "grid-cols-2"
        : "grid-flow-col auto-cols-[70%] overflow-x-auto sm:grid-cols-3 sm:auto-cols-auto sm:overflow-visible";

  return (
    <div className="flex flex-col gap-2">
      {attachment.caption ? (
        <p className="text-sm text-muted">{attachment.caption}</p>
      ) : null}
      <div className={cn("grid gap-2", grid)}>
        {attachment.items.map((item, index) => (
          <GalleryThumb
            key={item.id}
            title={item.title}
            thumbUrl={item.thumbUrl}
            onOpen={() => setOpenIndex(index)}
            large={count === 1}
          />
        ))}
      </div>
      {openIndex !== null ? (
        <Lightbox
          items={attachment.items}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </div>
  );
}

function GalleryThumb({
  title,
  thumbUrl,
  onOpen,
  large,
}: {
  title: string;
  thumbUrl: string;
  onOpen: () => void;
  large: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface-2",
        large ? "aspect-[4/3]" : "aspect-square",
      )}
      aria-label={`Open ${title}`}
    >
      {!loaded ? <Skeleton className="absolute inset-0 size-full" /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- relative auth asset URLs */}
      <img
        src={thumbUrl}
        alt={title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "size-full object-cover transition-opacity",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </button>
  );
}
