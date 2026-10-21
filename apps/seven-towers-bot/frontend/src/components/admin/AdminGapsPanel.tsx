"use client";

import Link from "next/link";
import { useAdminGapsList } from "@/components/admin/useAdminGapsList";
import type { KnowledgeGapItem, KnowledgeGapStatus } from "@/lib/types";
import { relativeTime, truncate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export function AdminGapsPanel() {
  const list = useAdminGapsList();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <label htmlFor="gap-status" className="text-sm font-medium text-text">
          Status
        </label>
        <select
          id="gap-status"
          value={list.status}
          onChange={(e) => list.setStatus(e.target.value as KnowledgeGapStatus)}
          className="min-h-[44px] rounded-md border border-border bg-surface px-4 text-sm text-text"
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>
      </div>

      <GapsTable
        items={list.items}
        loading={list.loading}
        busyId={list.busyId}
        onResolve={(id) => void list.setGapStatus(id, "resolved")}
        onIgnore={(id) => void list.setGapStatus(id, "ignored")}
        onReopen={(id) => void list.setGapStatus(id, "open")}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Page {list.page} of {list.maxPage} · {list.total} unknowns
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

function GapsTable({
  items,
  loading,
  busyId,
  onResolve,
  onIgnore,
  onReopen,
}: {
  items: KnowledgeGapItem[];
  loading: boolean;
  busyId: string | null;
  onResolve: (id: string) => void;
  onIgnore: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-surface-2 text-left">
          <tr>
            {[
              "Need",
              "Count",
              "Asked by",
              "Last asked",
              "Example question",
              "Chat",
              "Actions",
            ].map((label) => (
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
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }, (__, j) => (
                  <td key={j} className="border-b border-border px-3 py-3">
                    <Skeleton className="h-4 w-full max-w-[8rem]" />
                  </td>
                ))}
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-muted">
                No unknowns for this filter.
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id}>
                <td className="max-w-[14rem] border-b border-border px-3 py-2 text-text">
                  {row.need}
                </td>
                <td className="border-b border-border px-3 py-2 text-muted">
                  {row.count}
                </td>
                <td className="border-b border-border px-3 py-2 text-muted">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text">{row.lastAskerName}</span>
                    <span className="font-mono text-xs">{row.lastAskerEmail}</span>
                  </div>
                </td>
                <td className="border-b border-border px-3 py-2 text-muted">
                  {relativeTime(row.lastSeenAt)}
                </td>
                <td className="max-w-[12rem] border-b border-border px-3 py-2 text-muted">
                  {truncate(row.lastQuestion, 80)}
                </td>
                <td className="border-b border-border px-3 py-2">
                  <Link
                    href={`/admin/chat/?id=${row.lastConversationId}`}
                    className="text-accent underline"
                  >
                    Open
                  </Link>
                </td>
                <td className="border-b border-border px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {row.status !== "resolved" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => onResolve(row.id)}
                      >
                        Resolve
                      </Button>
                    ) : null}
                    {row.status !== "ignored" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => onIgnore(row.id)}
                      >
                        Ignore
                      </Button>
                    ) : null}
                    {row.status !== "open" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => onReopen(row.id)}
                      >
                        Reopen
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
