"use client";

import type { AdminUserListItem } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

type UsersTableProps = {
  items: AdminUserListItem[];
  loading: boolean;
  onRowClick: (id: string) => void;
};

const COLS = [
  "Name",
  "Email",
  "Phone",
  "Role",
  "Status",
  "Created",
  "Last login",
] as const;

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <tr key={i}>
          {COLS.map((col) => (
            <td key={col} className="border-b border-border px-3 py-3">
              <Skeleton className="h-4 w-full max-w-[8rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function UsersTable({ items, loading, onRowClick }: UsersTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-surface-2 text-left">
          <tr>
            {COLS.map((label) => (
              <th
                key={label}
                className="whitespace-nowrap border-b border-border px-3 py-2 font-medium text-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows />
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={COLS.length} className="px-3 py-8 text-center text-muted">
                No users match your filters.
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer hover:bg-surface-2/80"
                onClick={() => onRowClick(row.id)}
              >
                <td className="border-b border-border px-3 py-2 text-text">
                  {row.fullName}
                </td>
                <td className="border-b border-border px-3 py-2 text-text">
                  {row.email}
                </td>
                <td className="border-b border-border px-3 py-2 text-muted">
                  {row.phone}
                </td>
                <td className="border-b border-border px-3 py-2">
                  <Badge variant={row.role === "admin" ? "admin" : "user"}>
                    {row.role}
                  </Badge>
                </td>
                <td className="border-b border-border px-3 py-2">
                  <Badge variant={row.status}>
                    {row.status}
                  </Badge>
                </td>
                <td className="border-b border-border px-3 py-2 text-muted">
                  {relativeTime(row.createdAt)}
                </td>
                <td className="border-b border-border px-3 py-2 text-muted">
                  {row.lastLoginAt ? relativeTime(row.lastLoginAt) : "Never"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
