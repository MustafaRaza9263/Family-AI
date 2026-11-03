'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type {
  AdminJobsQuery,
  AdminStatsRange,
  AdminUserListQuery,
  AdminUserListResponse,
} from '@studio/shared';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import * as adminApi from './api';
import { filterToQuery, type JobsFilter } from './jobs-url';

export function usersQueryKey(query: AdminUserListQuery): QueryKey {
  return queryKeys.adminUsers(query.status, query.q ?? '', query.page);
}

export function useAdminUsers(query: AdminUserListQuery) {
  return useQuery({
    queryKey: usersQueryKey(query),
    queryFn: () => adminApi.listUsers(query),
  });
}

export function useUpdateUserStatus(query: AdminUserListQuery) {
  const queryClient = useQueryClient();
  const key = usersQueryKey(query);

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'active' | 'disabled';
    }) => adminApi.updateUserStatus(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AdminUserListResponse>(key);
      if (previous) {
        queryClient.setQueryData<AdminUserListResponse>(key, {
          ...previous,
          items: previous.items.map((user) =>
            user.id === id ? { ...user, status } : user,
          ),
        });
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.status === 'active' ? 'User approved' : 'User updated');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useAdminEngine() {
  return useQuery({
    queryKey: queryKeys.adminEngine,
    queryFn: adminApi.getEngine,
  });
}

export function usePatchEngine() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: adminApi.patchEngine,
    onSuccess: (data) => {
      client.setQueryData(queryKeys.adminEngine, data);
      void client.invalidateQueries({ queryKey: queryKeys.capabilities });
      toast.success(data.paused ? 'Engine paused' : 'Engine resumed');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Update failed');
    },
  });
}

export function useAdminStats(range: AdminStatsRange) {
  return useQuery({
    queryKey: queryKeys.adminStats(range),
    queryFn: () => adminApi.getAdminStats(range),
    staleTime: 60_000,
  });
}

/** Build a stable filter key for React Query from the UI filter state. */
function filterKey(f: JobsFilter): Record<string, string> {
  const q = filterToQuery(f);
  // Build a plain-object key (cursor excluded — paging is handled by infinite query).
  const key: Record<string, string> = {};
  if (q.status) key.status = q.status;
  if (q.tool) key.tool = q.tool;
  if (q.recipe) key.recipe = q.recipe;
  if (q.user) key.user = q.user;
  if (q.q) key.q = q.q;
  if (q.from) key.from = q.from;
  if (q.to) key.to = q.to;
  return key;
}

export function useAdminJobsInfinite(filter: JobsFilter) {
  return useInfiniteQuery({
    queryKey: queryKeys.adminJobsInfinite(filterKey(filter)),
    queryFn: ({ pageParam }) => {
      const q: AdminJobsQuery = { ...filterToQuery(filter), cursor: pageParam };
      return adminApi.listAdminJobs(q);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Polls every 2s while the job is running so the drawer stays live. */
export function useAdminJob(id: string) {
  return useQuery({
    queryKey: queryKeys.adminJob(id),
    queryFn: () => adminApi.getAdminJob(id),
    enabled: id.length > 0,
    // refetchInterval as a function: poll while running, stop otherwise.
    refetchInterval: (query) =>
      query.state.data?.job.status === 'running' ? 2000 : false,
  });
}
