"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { UserMenu } from "@/components/layout/UserMenu";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Composer } from "@/components/chat/Composer";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/chat/Sidebar";
import { Spinner } from "@/components/ui/Spinner";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { pageFade } from "@/lib/motion";

/** Must sit under Suspense because it reads searchParams. */
export function ChatPage() {
  const router = useRouter();
  const params = useSearchParams();
  const conversationId = params.get("c");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    items,
    nextBefore,
    loading: listLoading,
    loadingMore,
    refresh,
    loadMore,
  } = useConversations();

  const onCreated = useCallback(
    (id: string) => {
      router.replace(`/?c=${encodeURIComponent(id)}`);
      void refresh();
    },
    [router, refresh],
  );

  const chat = useChat(conversationId, { onConversationCreated: onCreated });
  const active = items.find((c) => c.id === conversationId);

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      sidebar={
        <Sidebar
          conversations={items}
          activeId={conversationId}
          loading={listLoading}
          loadingMore={loadingMore}
          hasMore={Boolean(nextBefore)}
          onNewChat={() => {
            router.replace("/");
            setSidebarOpen(false);
          }}
          onSelect={(id) => {
            router.replace(`/?c=${encodeURIComponent(id)}`);
            setSidebarOpen(false);
          }}
          onLoadMore={() => void loadMore()}
          footer={<UserMenu />}
        />
      }
      header={
        <ChatHeader
          title={active?.title ?? "New chat"}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      }
    >
      <motion.div
        className="flex h-full flex-col"
        initial={pageFade.initial}
        animate={pageFade.animate}
        transition={pageFade.transition}
      >
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
          {chat.loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : chat.messages.length === 0 ? (
            <EmptyState onPrompt={(t) => void chat.send(t)} />
          ) : (
            <MessageList
              messages={chat.messages}
              statusMessage={chat.statusMessage}
              onRetry={chat.retryLast}
            />
          )}
        </div>
        <div className="pb-[env(safe-area-inset-bottom)]">
          <Composer
            onSend={(t) => void chat.send(t)}
            onStop={chat.stop}
            streaming={chat.streaming}
          />
        </div>
      </motion.div>
    </AppShell>
  );
}
