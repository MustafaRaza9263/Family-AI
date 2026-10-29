'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AuthSplash, RequireAuth } from '@/features/auth/auth-guard';
import { useMe } from '@/features/auth/hooks';

function AppFrame({ children }: { children: ReactNode }) {
  const { data } = useMe();
  const user = data?.user;
  if (!user) {
    return <AuthSplash />;
  }
  return <AppShell user={user}>{children}</AppShell>;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppFrame>{children}</AppFrame>
    </RequireAuth>
  );
}
