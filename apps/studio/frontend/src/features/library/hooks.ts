'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { AssetDto, LibraryPage } from '@studio/shared';
import { queryKeys } from '@/lib/query-keys';
import * as api from './api';

export function useLibraryInfinite(
  kind: AssetDto['kind'] | undefined,
  favorited: boolean,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.libraryInfinite(kind, favorited),
    queryFn: ({ pageParam }) =>
      api.listLibrary({ kind, favorited, cursor: pageParam }),
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

export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleFavorite(id),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: ['library'] });
      const previous = client.getQueriesData<InfiniteData<LibraryPage>>({
        queryKey: ['library'],
      });
      client.setQueriesData<InfiniteData<LibraryPage>>(
        { queryKey: ['library'] },
        (data) => {
          if (!data) return data;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === id
                  ? { ...item, favorited: !item.favorited }
                  : item,
              ),
            })),
          };
        },
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (!ctx?.previous) return;
      for (const [key, data] of ctx.previous) {
        client.setQueryData(key, data);
      }
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['library'] });
    },
  });
}
