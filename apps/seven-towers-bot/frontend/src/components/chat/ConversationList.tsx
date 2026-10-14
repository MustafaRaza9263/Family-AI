"use client";

import { useMemo } from "react";
import type { Conversation } from "@/lib/types";
import type { DateGroup } from "@/lib/format";
import { groupByDate, truncate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const GROUP_ORDER: DateGroup[] = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Older",
];

type ConversationListProps = {
  items: Conversation[];
  activeId: string | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
};

export function ConversationList({
  items,
  activeId,
  loading,
  loadingMore,
  hasMore,
  onSelect,
  onLoadMore,
}: ConversationListProps) {
  const grouped = useMemo(() => {
    const map = new Map<DateGroup, Conversation[]>();
    for (const item of items) {
      const key = groupByDate(item.updatedAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      label: g,
      items: map.get(g) ?? [],
    }));
  }, [items]);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted">No conversations yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-2 py-2">
      {grouped.map((section) => (
        <section key={section.label}>
          <h3 className="px-2 pb-1 text-xs font-medium text-muted">
            {section.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2",
                    item.id === activeId && "bg-surface-2 font-medium text-text",
                  )}
                >
                  {truncate(item.title || "New chat", 42)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hasMore ? (
        <Button
          variant="ghost"
          className="mx-2"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
