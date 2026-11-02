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

export function useThreads(tool?: 'image' | 'video') {
  return useQuery({
    queryKey: queryKeys.threads(undefined, tool),
    queryFn: () => api.listThreads(tool ? { tool } : undefined),
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
    mutationFn: (input: { tool: 'image' | 'video'; title?: string }) =>
      api.createThread(input),
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
      /** Called sync inside onSuccess so callers can fold the job before paint. */
      onCreated?: (data: { job: ThreadDetailResponse['items'][number]['job'] }) => void;
    }) => api.createGeneration(threadId, input),
    onSuccess: (data, { threadId, onCreated }) => {
      client.setQueryData<ThreadDetailResponse>(
        queryKeys.thread(threadId),
        (prev) => {
          const base = prev ?? {
            thread: {
              id: threadId,
              tool: data.job.tool,
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
      onCreated?.(data);
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

export function useExtractFrame() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      at,
    }: {
      assetId: string;
      at: 'first' | 'last';
    }) => api.extractFrame(assetId, at),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['library'] });
    },
  });
}
