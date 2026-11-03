'use client';

/**
 * Admin section shell: fixed header + live strip + tabs.
 * Mounted once from admin/layout so the SSE connection survives tab changes.
 */

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminEventsProvider } from './admin-events-context';
import { JobDrawer } from './job-drawer';
import { LiveStrip } from './live-strip';
import { useAdminEvents } from './use-admin-events';

type Tab = 'overview' | 'jobs' | 'users' | 'engine';

function pathToTab(pathname: string): Tab {
  if (pathname.includes('/jobs')) return 'jobs';
  if (pathname.includes('/users')) return 'users';
  if (pathname.includes('/engine')) return 'engine';
  return 'overview';
}

const TAB_ROUTES: Record<Tab, string> = {
  overview: '/admin/',
  jobs: '/admin/jobs/',
  users: '/admin/users/',
  engine: '/admin/engine/',
};

/** Same pill tab look as Library (transparent list, muted active chip). */
const tabTriggerClass =
  'rounded-full px-4 py-2 text-[15px] font-medium shadow-none ' +
  'text-muted-foreground hover:text-foreground ' +
  'data-[state=active]:bg-surface-muted data-[state=active]:text-foreground ' +
  'data-[state=active]:shadow-none';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const tab = pathToTab(pathname);

  // One SSE connection for the whole admin section (layout-stable).
  const evState = useAdminEvents(true);

  // Drawer can also be opened from the live strip (running-job chip).
  const [stripJobId, setStripJobId] = useState<string | null>(null);

  return (
    <AdminEventsProvider value={evState}>
      <div className="flex h-full min-h-full w-full min-w-0 flex-col">
        <header className="flex h-[7.25rem] shrink-0 flex-col justify-between gap-3 sm:h-[8rem]">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Admin
          </h1>
          <LiveStrip
            state={evState}
            onOpenJob={(jobId) => {
              if (tab !== 'jobs') router.push('/admin/jobs/');
              setStripJobId(jobId);
            }}
          />
        </header>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            router.replace(TAB_ROUTES[value as Tab] ?? '/admin/');
          }}
          className="mt-4 flex min-h-0 flex-1 flex-col sm:mt-5"
        >
          <TabsList className="h-auto gap-1 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="overview" className={tabTriggerClass}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="jobs" className={tabTriggerClass}>
              Jobs
            </TabsTrigger>
            <TabsTrigger value="users" className={tabTriggerClass}>
              Users
            </TabsTrigger>
            <TabsTrigger value="engine" className={tabTriggerClass}>
              Engine
            </TabsTrigger>
          </TabsList>

          <div className="mt-5 min-h-0 flex-1">{children}</div>
        </Tabs>

        <JobDrawer jobId={stripJobId} onClose={() => setStripJobId(null)} />
      </div>
    </AdminEventsProvider>
  );
}
