'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as authApi from './api';

export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: authApi.fetchMe,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(meQueryKey, data);
      router.replace('/');
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(meQueryKey, null);
      router.replace('/login/');
    },
    onError: () => {
      toast.error('Could not sign out. Please try again.');
    },
  });
}
