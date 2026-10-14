"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { Conversation } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ConversationList } from "./ConversationList";

type SidebarProps = {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
  footer?: ReactNode;
};

export function Sidebar({
  conversations,
  activeId,
  loading,
  loadingMore,
  hasMore,
  onNewChat,
  onSelect,
  onLoadMore,
  footer,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-surface">
      <div className="p-3">
        <Button variant="secondary" className="w-full justify-start gap-2" onClick={onNewChat}>
          <Plus className="size-4" aria-hidden />
          New chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConversationList
          items={conversations}
          activeId={activeId}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onSelect={onSelect}
          onLoadMore={onLoadMore}
        />
      </div>
      {footer ? (
        <div className="border-t border-border p-3">{footer}</div>
      ) : null}
    </aside>
  );
}
