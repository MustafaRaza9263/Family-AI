'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AuthSplash } from './auth-guard';
import { useMe } from './hooks';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  const router = useRouter();
  const user = data?.user;

  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <AuthSplash />;
  }
  if (user.role !== 'admin') {
    return <AuthSplash />;
  }
  return <>{children}</>;
}
