"use client";

import { useRouter } from "next/navigation";
import { useAdminUsersList } from "@/components/admin/useAdminUsersList";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UsersTable } from "./UsersTable";

export function AdminUsersPanel() {
  const router = useRouter();
  const list = useAdminUsersList();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Search users"
          placeholder="Name, email, or phone"
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-status" className="text-sm font-medium text-text">
            Status
          </label>
          <select
            id="user-status"
            value={list.statusFilter}
            onChange={(e) =>
              list.setStatusFilter(e.target.value as typeof list.statusFilter)
            }
            className="min-h-[44px] rounded-md border border-border bg-surface px-4 text-sm text-text"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>
      <UsersTable
        items={list.items}
        loading={list.loading}
        onRowClick={(id) => router.push(`/admin/user/?id=${id}`)}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Page {list.page} of {list.maxPage} · {list.total} users
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={list.page <= 1 || list.loading}
            onClick={() => list.setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={list.page >= list.maxPage || list.loading}
            onClick={() => list.setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
