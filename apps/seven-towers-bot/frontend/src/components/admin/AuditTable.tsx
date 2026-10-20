"use client";

import type { AuditEntry } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

type AuditTableProps = {
  items: AuditEntry[];
  loading: boolean;
};

function formatTargets(entry: AuditEntry): string {
  const parts: string[] = [];
  if (entry.targetUserId) parts.push(`user:${entry.targetUserId}`);
  if (entry.targetConversationId) {
    parts.push(`chat:${entry.targetConversationId}`);
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <tr key={i}>
          {Array.from({ length: 5 }, (__, j) => (
            <td key={j} className="border-b border-border px-3 py-3">
              <Skeleton className="h-4 w-full max-w-[6rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AuditTable({ items, loading }: AuditTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-surface-2 text-left">
          <tr>
            {["Action", "Actor", "Targets", "When", "IP"].map((label) => (
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
              <td colSpan={5} className="px-3 py-8 text-center text-muted">
                No audit entries yet.
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id}>
                <td className="border-b border-border px-3 py-2 font-mono text-xs text-text">
                  {row.action}
                </td>
                <td className="border-b border-border px-3 py-2 font-mono text-xs text-muted">
                  {row.actorId}
                </td>
                <td className="border-b border-border px-3 py-2 font-mono text-xs text-muted">
                  {formatTargets(row)}
                </td>
                <td className="border-b border-border px-3 py-2 text-muted">
                  {relativeTime(row.at)}
                </td>
                <td className="border-b border-border px-3 py-2 text-muted">
                  {row.ip ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
