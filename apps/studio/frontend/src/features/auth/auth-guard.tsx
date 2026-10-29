'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { BrandMark } from '@/components/layout/brand-mark';
import { Spinner } from '@/components/ui/spinner';
import { useMe } from './hooks';

export function AuthSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <BrandMark size="lg" />
      <Spinner className="size-6 text-primary" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Redirect signed-out visitors to login; show splash while loading. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data, isLoading, isFetching } = useMe();
  const router = useRouter();
  const user = data?.user;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login/');
    }
  }, [isLoading, user, router]);

  if (isLoading || (isFetching && data === undefined)) {
    return <AuthSplash />;
  }
  if (!user) {
    return <AuthSplash />;
  }
  return <>{children}</>;
}

/** Redirect signed-in visitors away from auth pages. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  const router = useRouter();
  const user = data?.user;

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/');
    }
  }, [isLoading, user, router]);

  if (isLoading || user) {
    return <AuthSplash />;
  }
  return <>{children}</>;
}
