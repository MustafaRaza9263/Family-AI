'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import { useCapabilities, useThread } from '../hooks';
import { resolveToolId } from '../resolve-tool-id';
import { ThreadView } from './thread-view';

export function CreatePage() {
  const params = useSearchParams();
  const router = useRouter();
  const toolId = resolveToolId(params.get('tool'));
  const threadId = params.get('thread') ?? undefined;
  const baseParam = params.get('base');
  const [baseAssetId, setBaseAssetId] = useState<string | undefined>(
    () => baseParam ?? undefined,
  );
  // After we strip ?base=, the next params change must not clear the seed.
  const strippingBase = useRef(false);

  useEffect(() => {
    if (baseParam) {
      strippingBase.current = true;
      // Soft-nav from Animate / library must update seed (mount-only state is stale).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL ?base= seed
      setBaseAssetId(baseParam);
      const next = new URLSearchParams(params.toString());
      next.delete('base');
      router.replace(`/create/?${next.toString()}`);
      return;
    }
    if (strippingBase.current) {
      strippingBase.current = false;
      return;
    }
    // Fresh /create/?tool=… (sidebar New …) — drop a stale Animate seed.
    if (!threadId) setBaseAssetId(undefined);
  }, [baseParam, toolId, threadId, params, router]);

  const caps = useCapabilities();
  const thread = useThread(threadId);

  // Keep ?tool= aligned with the thread’s locked tool.
  useEffect(() => {
    if (!thread.data) return;
    const threadTool = resolveToolId(thread.data.thread.tool);
    if (threadTool === toolId) return;
    const next = new URLSearchParams(params.toString());
    next.set('tool', threadTool);
    router.replace(`/create/?${next.toString()}`);
  }, [thread.data, toolId, params, router]);

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

  // Remount when tool / thread / animate seed changes so tray state is clean.
  const viewKey = `${toolId}-${threadId ?? 'new'}-${baseAssetId ?? ''}`;

  if (!threadId) {
    return (
      <ThreadView
        key={viewKey}
        toolId={toolId}
        thread={null}
        capabilities={caps.data}
        initialBaseAssetId={baseAssetId}
      />
    );
  }

  if (thread.data) {
    const threadTool = resolveToolId(thread.data.thread.tool);
    return (
      <ThreadView
        key={viewKey}
        toolId={threadTool}
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
