'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EngineCard } from './engine-card';
import { UsersPage } from './users-page';

/**
 * Extension point: add Dashboard / Jobs / Run log tabs here later.
 * Only Users + Engine ship now.
 */
export function AdminShell() {
  const pathname = usePathname();
  const router = useRouter();
  const tab = pathname.includes('/engine') ? 'engine' : 'users';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          router.replace(value === 'engine' ? '/admin/engine/' : '/admin/users/');
        }}
      >
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="engine">Engine</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersPage />
        </TabsContent>
        <TabsContent value="engine">
          <EngineCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
