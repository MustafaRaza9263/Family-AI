'use client';

import { useQueries } from '@tanstack/react-query';
import type { UserJob } from '@studio/shared';
import { useMemo } from 'react';
import * as createApi from '@/features/create/api';
import { useThreads } from '@/features/create/hooks';
import { queryKeys } from '@/lib/query-keys';

const THREAD_LOOKBACK = 8;

/** Active jobs for Home, derived from recent thread details (SSE keeps them live). */
export function useHomeQueue() {
  const threads = useThreads();
  const ids = useMemo(
    () => (threads.data?.items ?? []).slice(0, THREAD_LOOKBACK).map((t) => t.id),
    [threads.data?.items],
  );

  const details = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.thread(id),
      queryFn: () => createApi.getThread(id),
      staleTime: 15_000,
    })),
  });

  const jobs = useMemo(() => {
    const active: UserJob[] = [];
    for (const q of details) {
      for (const item of q.data?.items ?? []) {
        if (item.job.status === 'queued' || item.job.status === 'running') {
          active.push(item.job);
        }
      }
    }
    return active.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'running' ? -1 : 1;
      return (
        new Date(a.timings.queuedAt).getTime() -
        new Date(b.timings.queuedAt).getTime()
      );
    });
  }, [details]);

  const loading =
    threads.isLoading ||
    (ids.length > 0 && details.some((d) => d.isPending && !d.data));

  return { jobs, loading };
}
