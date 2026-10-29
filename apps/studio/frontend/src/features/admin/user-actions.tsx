'use client';

import type { PublicUser } from '@studio/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useUpdateUserStatus } from './hooks';
import type { AdminUserListQuery } from '@studio/shared';

export function UserActions({
  user,
  query,
}: {
  user: PublicUser;
  query: AdminUserListQuery;
}) {
  const update = useUpdateUserStatus(query);
  const [confirm, setConfirm] = useState<'reject' | 'disable' | null>(null);

  if (user.role === 'admin') {
    return <span className="text-xs text-muted-foreground">Admin</span>;
  }

  if (user.status === 'pending') {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => update.mutate({ id: user.id, status: 'active' })}
            loading={update.isPending}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirm('reject')}
          >
            Reject
          </Button>
        </div>
        <ConfirmDialog
          open={confirm === 'reject'}
          onOpenChange={(open) => !open && setConfirm(null)}
          title="Reject this request?"
          description={`${user.fullName} will be marked disabled and cannot sign in.`}
          confirmLabel="Reject"
          danger
          loading={update.isPending}
          onConfirm={() => {
            update.mutate(
              { id: user.id, status: 'disabled' },
              { onSuccess: () => setConfirm(null) },
            );
          }}
        />
      </>
    );
  }

  if (user.status === 'active') {
    return (
      <>
        <Button
          size="sm"
          variant="danger"
          onClick={() => setConfirm('disable')}
        >
          Disable
        </Button>
        <ConfirmDialog
          open={confirm === 'disable'}
          onOpenChange={(open) => !open && setConfirm(null)}
          title="Disable this account?"
          description={`${user.fullName} will be signed out and cannot sign in until re-enabled.`}
          confirmLabel="Disable"
          danger
          loading={update.isPending}
          onConfirm={() => {
            update.mutate(
              { id: user.id, status: 'disabled' },
              { onSuccess: () => setConfirm(null) },
            );
          }}
        />
      </>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      loading={update.isPending}
      onClick={() => update.mutate({ id: user.id, status: 'active' })}
    >
      Re-enable
    </Button>
  );
}
