"use client";

import { PanelLeftClose, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { Conversation } from "@/lib/types";
import { APP_SHORT_NAME } from "@/lib/config";
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
  /** Desktop: collapse the rail. */
  onCollapse?: () => void;
  /** Mobile drawer: dismiss the overlay. */
  onClose?: () => void;
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
  onClose,
  footer,
}: SidebarProps) {
  const onHide =
    onCollapse || onClose
      ? () => {
          // One control: close the mobile drawer and/or collapse the desktop rail.
          onClose?.();
          onCollapse?.();
        }
      : undefined;

  return (
    <aside className="flex h-full w-full flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
        <p className="truncate text-base font-semibold text-text">
          {APP_SHORT_NAME}
        </p>
        {onHide ? (
          <button
            type="button"
            aria-label="Hide sidebar"
            title="Hide sidebar"
            onClick={onHide}
            className="inline-flex size-8 shrink-0 items-center justify-center text-muted hover:text-text"
          >
            <PanelLeftClose className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="px-2 pb-1">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-text hover:bg-surface-2"
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
