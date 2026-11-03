'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/features/auth/hooks';
import * as createApi from '@/features/create/api';
import {
  Composer,
  useCapabilities,
  type ComposerHandle,
} from '@/features/create';
import { useCreateThread } from '@/features/create/hooks';
import type { ToolId } from '@/features/create/tool-ui';
import { ApiError } from '@/lib/api-client';
import { errorMessage } from '@/lib/errors';
import { firstName } from '@/lib/format';
import { HomeHero } from './home-hero';
import { HomeTopbar } from './home-topbar';
import { IdeaChips } from './idea-chips';
import { QueuePanel } from './queue-panel';
import {
  QuickStartPanel,
  type QuickStartAction,
} from './quick-start-panel';
import { ToolSwitch } from './tool-switch';
import { UsagePanel } from './usage-panel';
import { useHomeQueue } from './use-home-queue';

type PendingComposer = 'focus' | 'attach' | null;

function toolForAction(action: QuickStartAction): ToolId {
  return action === 'video' || action === 'animate' ? 'video' : 'image';
}

function pendingForAction(action: QuickStartAction): 'focus' | 'attach' {
  return action === 'image' || action === 'video' ? 'focus' : 'attach';
}

export function HomePage() {
  const { data } = useMe();
  const caps = useCapabilities();
  const createThread = useCreateThread();
  const router = useRouter();
  const client = useQueryClient();
  const queue = useHomeQueue();

  const composerRef = useRef<ComposerHandle>(null);
  const composerSectionRef = useRef<HTMLElement>(null);

  const [toolId, setToolId] = useState<ToolId>('image');
  const [submitting, setSubmitting] = useState(false);
  const [seed, setSeed] = useState({ prompt: '', n: 0 });
  const [pending, setPending] = useState<PendingComposer>(null);

  const name = data?.user ? firstName(data.user.fullName) : '';
  const imageTool = caps.data?.tools.find((t) => t.id === 'image');
  const videoTool = caps.data?.tools.find((t) => t.id === 'video');
  const showVideo = Boolean(videoTool);
  const activeTool =
    toolId === 'video' && videoTool ? videoTool : imageTool;
  const quota =
    toolId === 'video' && caps.data
      ? caps.data.limits.video
      : caps.data?.limits.image;

  const runPending = useCallback((next: Exclude<PendingComposer, null>) => {
    if (next === 'focus') composerRef.current?.focus();
    else composerRef.current?.pickFiles();
  }, []);

  useEffect(() => {
    if (pending !== 'focus' && pending !== 'attach') return;
    const next: 'focus' | 'attach' = pending;
    let cancelled = false;
    // Wait for tool remount before focusing / opening the file picker.
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        runPending(next);
        setPending(null);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [pending, toolId, runPending]);

  const onQuickStart = useCallback(
    (action: QuickStartAction) => {
      if ((action === 'video' || action === 'animate') && !showVideo) return;

      const nextTool = toolForAction(action);
      const nextPending = pendingForAction(action);
      composerSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      if (toolId === nextTool) {
        runPending(nextPending);
        return;
      }
      setToolId(nextTool);
      setPending(nextPending);
    },
    [runPending, showVideo, toolId],
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-[clamp(1.125rem,3.2vh,2.125rem)] md:h-full md:min-h-0">
      <div className="hidden md:mb-auto md:block">
        <HomeTopbar showVideo={showVideo} />
      </div>

      {/* Mobile: nudge hero + composer toward the vertical center */}
      <div className="flex flex-col gap-[clamp(1.125rem,3.2vh,2.125rem)] pt-[min(10vh,4.5rem)] md:contents md:pt-0">
        <HomeHero name={name} />

        <section
          ref={composerSectionRef}
          aria-label="Composer"
          className="mx-auto w-full max-w-[760px]"
        >
          {caps.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {activeTool && caps.data && quota ? (
            <>
              <Composer
                key={`${toolId}-${seed.n}`}
                ref={composerRef}
                tool={activeTool}
                engineState={caps.data.engine.state}
                quota={quota}
                submitting={submitting || createThread.isPending}
                initialPrompt={seed.prompt}
                startSlot={
                  <ToolSwitch
                    value={toolId === 'video' && showVideo ? 'video' : 'image'}
                    onChange={(id) => {
                      setToolId(id);
                      setSeed((s) => ({ prompt: '', n: s.n + 1 }));
                    }}
                    showVideo={showVideo}
                  />
                }
                onSubmit={async (payload) => {
                  const tool = activeTool.id;
                  setSubmitting(true);
                  try {
                    const created = await createThread.mutateAsync({ tool });
                    await createApi.createGeneration(created.thread.id, {
                      tool,
                      prompt: payload.prompt,
                      values: payload.values,
                      variant: payload.variant,
                      inputAssetIds: payload.inputAssetIds,
                    });
                    void client.invalidateQueries({ queryKey: ['thread'] });
                    router.push(
                      `/create/?tool=${tool}&thread=${created.thread.id}`,
                    );
                  } catch (err) {
                    const code = err instanceof ApiError ? err.code : undefined;
                    toast.error(errorMessage(code));
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
              <IdeaChips
                onPick={(idea) =>
                  setSeed((s) => ({ prompt: idea, n: s.n + 1 }))
                }
              />
            </>
          ) : null}
        </section>

        {/* Mobile: Usage sits directly under the composer */}
        <div className="mx-auto w-full max-w-[760px] md:hidden">
          {caps.data ? (
            <UsagePanel
              image={caps.data.limits.image}
              video={caps.data.limits.video}
              showVideo={showVideo}
            />
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[860px] grid-cols-1 items-stretch gap-2.5 pb-2 md:mb-auto md:grid-cols-3 md:pb-0">
        <QuickStartPanel showVideo={showVideo} onAction={onQuickStart} />
        <QueuePanel
          jobs={queue.jobs}
          loading={queue.loading}
          slots={
            (caps.data?.limits.activeCap.running ?? 1) +
            (caps.data?.limits.activeCap.queued ?? 3)
          }
        />
        <div className="hidden md:block">
          {caps.data ? (
            <UsagePanel
              image={caps.data.limits.image}
              video={caps.data.limits.video}
              showVideo={showVideo}
            />
          ) : (
            <Skeleton className="h-full min-h-40 w-full" />
          )}
        </div>
      </div>
    </div>
  );
}
