'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { AssetDto } from '@studio/shared';
import { queryKeys } from '@/lib/query-keys';
import * as api from './api';

export function useLibraryInfinite(kind: AssetDto['kind'] | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.libraryInfinite(kind),
    queryFn: ({ pageParam }) =>
      api.listLibrary({ kind, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useDeleteLibraryAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAsset(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['library'] });
    },
  });
}
