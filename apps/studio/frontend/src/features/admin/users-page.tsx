'use client';

import type { AdminUserListQuery } from '@studio/shared';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminUsers } from './hooks';
import { StatusTabs, type StatusTab } from './status-tabs';
import { UserCardList } from './user-card-list';
import { UsersTable } from './users-table';

export function UsersPage() {
  const [tab, setTab] = useState<StatusTab>('pending');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const query: AdminUserListQuery = useMemo(
    () => ({
      status: tab === 'all' ? undefined : tab,
      q: debounced || undefined,
      page,
      limit: 20,
    }),
    [tab, debounced, page],
  );

  const { data, isLoading, isError, refetch, isFetching } = useAdminUsers(query);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Approve new accounts and manage access."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusTabs
          value={tab}
          counts={data?.counts ?? { pending: 0, active: 0, disabled: 0 }}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search users"
          className="sm:max-w-64"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Could not load users.
          </p>
          <Button className="mt-3" variant="secondary" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          {tab === 'pending'
            ? 'No pending requests.'
            : tab === 'active'
              ? 'No active users.'
              : tab === 'disabled'
                ? 'No disabled users.'
                : 'No users found.'}
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <UsersTable items={data.items} query={query} />
          <UserCardList items={data.items} query={query} />
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {totalPages}
              {isFetching ? ' · Updating…' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
