"use client";

import { PanelLeftClose, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { Conversation } from "@/lib/types";
import { IconButton } from "@/components/ui/IconButton";
import { CHROME_ICON } from "@/lib/motion";
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
  onCollapse?: () => void;
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
  onCollapse,
  footer,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col bg-surface">
      <div className="flex items-center gap-1 p-2">
        {onCollapse ? (
          <IconButton
            label="Hide sidebar"
            className={`hidden lg:inline-flex ${CHROME_ICON}`}
            onClick={onCollapse}
          >
            <PanelLeftClose className="size-5" />
          </IconButton>
        ) : null}
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md bg-surface-2 px-3 text-sm font-medium text-text hover:bg-border/40"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          <span className="truncate">New chat</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
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
      {footer ? <div className="p-2">{footer}</div> : null}
    </aside>
  );
}
