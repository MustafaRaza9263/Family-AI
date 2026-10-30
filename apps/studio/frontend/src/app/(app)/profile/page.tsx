'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useLogout, useMe } from '@/features/auth/hooks';
import { NotificationControls } from '@/features/notifications';

export default function ProfilePage() {
  const { data } = useMe();
  const logout = useLogout();
  const user = data?.user;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <Card className="space-y-4">
        <div>
          <p className="font-medium">{user?.fullName}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Theme</span>
          <ThemeToggle />
        </div>
        <NotificationControls />
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          loading={logout.isPending}
          onClick={() => logout.mutate()}
        >
          Sign out
        </Button>
      </Card>
    </div>
  );
}
