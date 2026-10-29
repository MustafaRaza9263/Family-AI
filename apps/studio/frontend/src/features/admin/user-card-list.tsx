'use client';

import type { AdminUserListQuery, PublicUser } from '@studio/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { UserActions } from './user-actions';

export function UserCardList({
  items,
  query,
}: {
  items: PublicUser[];
  query: AdminUserListQuery;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((user) => (
        <Card key={user.id} className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{user.fullName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge status={user.status}>{user.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Requested {formatDate(user.createdAt)}
          </p>
          <UserActions user={user} query={query} />
        </Card>
      ))}
    </div>
  );
}
