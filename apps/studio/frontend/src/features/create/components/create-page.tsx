'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import { useCapabilities, useThread } from '../hooks';
import { ThreadView } from './thread-view';

export function CreatePage() {
  const params = useSearchParams();
  const router = useRouter();
  const toolParam = params.get('tool');
  const toolId = toolParam === 'video' ? 'video' : 'image';
  const threadId = params.get('thread') ?? undefined;
  // Capture once at mount so stripping ?base= does not clear the seed.
  const [baseAssetId] = useState(() => params.get('base') ?? undefined);

  useEffect(() => {
    if (!params.get('base')) return;
    const next = new URLSearchParams(params.toString());
    next.delete('base');
    router.replace(`/create/?${next.toString()}`);
  }, [params, router]);

  const caps = useCapabilities();
  const thread = useThread(threadId);

  if (!caps.data && (caps.isLoading || caps.isPending)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (caps.isError || !caps.data) {
    return (
      <EmptyState
        title="Could not load tools"
        description="Refresh the page and try again."
      />
    );
  }

  if (!threadId) {
    return (
      <ThreadView
        toolId={toolId}
        thread={null}
        capabilities={caps.data}
        initialBaseAssetId={baseAssetId}
      />
    );
  }

  if (thread.data) {
    return (
      <ThreadView
        toolId={toolId}
        thread={thread.data}
        capabilities={caps.data}
        initialBaseAssetId={baseAssetId}
      />
    );
  }

  if (thread.isError) {
    const notFound =
      thread.error instanceof ApiError && thread.error.code === 'NOT_FOUND';
    return (
      <EmptyState
        title={notFound ? 'Thread not found' : 'Could not open thread'}
        description={
          notFound
            ? 'Start a new creation from the sidebar.'
            : 'Refresh the page and try again.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
