'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateGenerationRequest,
  ThreadDetailResponse,
} from '@studio/shared';
import { queryKeys } from '@/lib/query-keys';
import * as api from './api';

export function useCapabilities() {
  return useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: api.fetchCapabilities,
  });
}

export function useThreads() {
  return useQuery({
    queryKey: queryKeys.threads(),
    queryFn: api.listThreads,
  });
}

export function useThread(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.thread(id ?? ''),
    queryFn: () => api.getThread(id!),
    enabled: Boolean(id),
    refetchOnMount: 'always',
  });
}

export function useCreateThread() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => api.createThread(title),
    onSuccess: (data) => {
      client.setQueryData<ThreadDetailResponse>(
        queryKeys.thread(data.thread.id),
        { thread: data.thread, items: [] },
      );
      void client.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useCreateGeneration() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      threadId,
      input,
    }: {
      threadId: string;
      input: CreateGenerationRequest;
    }) => api.createGeneration(threadId, input),
    onSuccess: (data, { threadId }) => {
      client.setQueryData<ThreadDetailResponse>(
        queryKeys.thread(threadId),
        (prev) => {
          const base = prev ?? {
            thread: {
              id: threadId,
              title: '',
              createdAt: data.job.timings.queuedAt,
              updatedAt: data.job.timings.queuedAt,
            },
            items: [],
          };
          return {
            ...base,
            items: [...base.items, { job: data.job, assets: [] }],
          };
        },
      );
      void client.invalidateQueries({ queryKey: queryKeys.capabilities });
      void client.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useCancelGeneration() {
  return useMutation({
    mutationFn: (jobId: string) => api.cancelGeneration(jobId),
  });
}

export function useDeleteAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => api.deleteAsset(assetId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['thread'] });
      void client.invalidateQueries({ queryKey: ['library'] });
    },
  });
}
