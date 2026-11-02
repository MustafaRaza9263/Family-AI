'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/features/auth/hooks';
import * as createApi from '@/features/create/api';
import { Composer, useCapabilities, useThreads } from '@/features/create';
import { useCreateThread } from '@/features/create/hooks';
import { toolUi } from '@/features/create/tool-ui';
import { ApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';
import { firstName, greetingForNow } from '@/lib/format';

export default function HomePage() {
  const { data } = useMe();
  const caps = useCapabilities();
  const threads = useThreads();
  const createThread = useCreateThread();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const name = data?.user ? firstName(data.user.fullName) : '';
  const imageTool = caps.data?.tools.find((t) => t.id === 'image');
  const videoTool = caps.data?.tools.find((t) => t.id === 'video');
  const imageUi = toolUi('image');
  const videoUi = toolUi('video');
  const ImageIcon = imageUi.icon;
  const VideoIcon = videoUi.icon;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {greetingForNow()}, {name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Create images and videos for your next campaign.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/create/?tool=image">
            <Button variant="secondary" size="sm">
              <ImageIcon className="size-4" />
              {imageUi.newLabel}
            </Button>
          </Link>
          {videoTool ? (
            <Link href="/create/?tool=video">
              <Button variant="secondary" size="sm">
                <VideoIcon className="size-4" />
                {videoUi.newLabel}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {caps.isLoading ? <Skeleton className="h-40 w-full" /> : null}

      {imageTool && caps.data ? (
        <Composer
          tool={imageTool}
          engineState={caps.data.engine.state}
          quota={caps.data.limits.image}
          submitting={submitting || createThread.isPending}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              const created = await createThread.mutateAsync({ tool: 'image' });
              await createApi.createGeneration(created.thread.id, {
                tool: 'image',
                prompt: payload.prompt,
                values: payload.values,
                variant: payload.variant,
                inputAssetIds: payload.inputAssetIds,
              });
              router.push(`/create/?tool=image&thread=${created.thread.id}`);
            } catch (err) {
              const code = err instanceof ApiError ? err.code : undefined;
              toast.error(errorMessage(code));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent</h2>
          <Link
            href="/library/"
            className="text-sm font-medium text-primary hover:underline"
          >
            Library
          </Link>
        </div>
        {threads.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {threads.data && threads.data.items.length === 0 ? (
          <EmptyState
            title="No generations yet"
            description="Your recent threads will show up here."
            action={
              <Link href="/create/?tool=image">
                <Button>{imageUi.newLabel}</Button>
              </Link>
            }
          />
        ) : null}
        {threads.data && threads.data.items.length > 0 ? (
          <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
            {threads.data.items.slice(0, 6).map((t) => {
              const tUi = toolUi(t.tool);
              const Icon = tUi.icon;
              return (
                <li key={t.id}>
                  <Link
                    href={`/create/?tool=${t.tool}&thread=${t.id}`}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-muted"
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.title || 'Untitled'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
