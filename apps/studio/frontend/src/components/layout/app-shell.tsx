'use client';

import type { PublicUser } from '@studio/shared';
import type { ReactNode } from 'react';
import { useCapabilities, useThreads } from '@/features/create';
import { useStudioEvents } from '@/features/events';
import { BrandMark } from './brand-mark';
import { EngineBanner } from './engine-banner';
import { MobileTabBar } from './mobile-tab-bar';
import { OfflineBanner } from './offline-banner';
import { Sidebar } from './sidebar';
import { UserMenu } from './user-menu';

export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: ReactNode;
}) {
  useStudioEvents(true);
  const caps = useCapabilities();
  const threads = useThreads();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <OfflineBanner />
      <EngineBanner state={caps.data?.engine.state} />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar user={user} threads={threads.data?.items ?? []} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:hidden"
            style={{ paddingTop: 'max(0.75rem, var(--safe-top))' }}
          >
            <BrandMark size="sm" className="min-w-0" />
            <UserMenu user={user} avatarOnly />
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-4 py-6 pb-[calc(5rem+var(--safe-bottom))] md:px-8 md:pb-8">
            <div className="mx-auto flex min-h-full w-full max-w-screen-2xl flex-col">
              {children}
            </div>
          </main>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
}
