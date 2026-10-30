'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { AdminUserListQuery, AdminUserListResponse } from '@studio/shared';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import * as adminApi from './api';

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
