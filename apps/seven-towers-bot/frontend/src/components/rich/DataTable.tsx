"use client";

import { cn } from "@/lib/cn";
import type { TableAttachment } from "@/lib/types";

export function DataTable({ attachment }: { attachment: TableAttachment }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-text">{attachment.title}</h3>
        {attachment.notes ? (
          <p className="mt-1 text-sm text-muted">{attachment.notes}</p>
        ) : null}
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              {attachment.columns.map((col, i) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap border-b border-border px-3 py-2 font-medium text-muted",
                    i === 0 && "sticky left-0 bg-surface-2",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    (!col.align || col.align === "left") && "text-left",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attachment.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex % 2 === 1 ? "bg-surface-2/60" : undefined}
              >
                {attachment.columns.map((col, i) => {
                  const raw = row[col.key];
                  const isNum = typeof raw === "number";
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "whitespace-nowrap border-b border-border px-3 py-2 text-text",
                        i === 0 && "sticky left-0 bg-surface",
                        (col.align === "right" || isNum) &&
                          "text-right tabular-nums",
                        col.align === "center" && "text-center",
                      )}
                    >
                      {raw == null ? "" : String(raw)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
