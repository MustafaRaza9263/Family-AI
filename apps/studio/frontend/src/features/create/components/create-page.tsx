'use client';

import { useSearchParams } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import { useCapabilities, useThread } from '../hooks';
import { ThreadView } from './thread-view';

export function CreatePage() {
  const params = useSearchParams();
  const toolParam = params.get('tool');
  const toolId = toolParam === 'video' ? 'video' : 'image';
  const threadId = params.get('thread') ?? undefined;

  const caps = useCapabilities();
  const thread = useThread(threadId);

  // Caps are usually already cached from the app shell — only wait if empty.
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

  // New image: show composer immediately — no thread API until submit.
  if (!threadId) {
    return (
      <ThreadView
        toolId={toolId}
        thread={null}
        capabilities={caps.data}
      />
    );
  }

  // Existing thread: paint from cache instantly when present.
  if (thread.data) {
    return (
      <ThreadView
        toolId={toolId}
        thread={thread.data}
        capabilities={caps.data}
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
