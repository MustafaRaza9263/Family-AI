'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toolUi } from '@/features/create/tool-ui';

export function HomeTopbar({ showVideo }: { showVideo: boolean }) {
  const imageUi = toolUi('image');
  const videoUi = toolUi('video');
  const ImageIcon = imageUi.icon;
  const VideoIcon = videoUi.icon;

  return (
    <header className="flex items-center justify-end gap-2">
      <Link href="/create/?tool=image" className="hidden sm:inline-flex">
        <Button variant="secondary" size="sm" type="button">
          <ImageIcon className="size-4" />
          {imageUi.newLabel}
        </Button>
      </Link>
      {showVideo ? (
        <Link href="/create/?tool=video" className="hidden sm:inline-flex">
          <Button variant="secondary" size="sm" type="button">
            <VideoIcon className="size-4" />
            {videoUi.newLabel}
          </Button>
        </Link>
      ) : null}
    </header>
  );
}
