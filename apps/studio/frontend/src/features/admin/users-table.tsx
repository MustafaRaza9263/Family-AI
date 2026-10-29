'use client';

import type { AdminUserListQuery, PublicUser } from '@studio/shared';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { UserActions } from './user-actions';

export function UsersTable({
  items,
  query,
}: {
  items: PublicUser[];
  query: AdminUserListQuery;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-border md:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Requested</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium text-foreground">
                {user.fullName}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-4 py-3">
                <Badge status={user.status}>{user.status}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(user.createdAt)}
              </td>
              <td className="px-4 py-3">
                <UserActions user={user} query={query} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
