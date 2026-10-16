"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { UserMenu } from "@/components/layout/UserMenu";
import { Composer } from "@/components/chat/Composer";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/chat/Sidebar";
import { Spinner } from "@/components/ui/Spinner";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/cn";
import { pageFade } from "@/lib/motion";

/** Must sit under Suspense because it reads searchParams. */
export function ChatPage() {
  const router = useRouter();
  const params = useSearchParams();
  const conversationId = params.get("c");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    "sidebar-collapsed",
    false,
  );

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
  const isEmpty = !chat.loading && chat.messages.length === 0;

  const startNewChat = useCallback(() => {
    router.replace("/");
    setSidebarOpen(false);
  }, [router]);

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={setSidebarCollapsed}
      onNewChat={startNewChat}
      sidebar={
        <Sidebar
          conversations={items}
          activeId={conversationId}
          loading={listLoading}
          loadingMore={loadingMore}
          hasMore={Boolean(nextBefore)}
          onNewChat={startNewChat}
          onSelect={(id) => {
            router.replace(`/?c=${encodeURIComponent(id)}`);
            setSidebarOpen(false);
          }}
          onLoadMore={() => void loadMore()}
          onCollapse={() => setSidebarCollapsed(true)}
          onClose={() => setSidebarOpen(false)}
          footer={<UserMenu />}
        />
      }
    >
      <motion.div
        className="flex h-full flex-col"
        initial={pageFade.initial}
        animate={pageFade.animate}
        transition={pageFade.transition}
      >
        {chat.loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : isEmpty ? (
          <div
            className={cn(
              "flex flex-1 flex-col items-center justify-center px-2 pb-8 pt-16 lg:pt-0",
              sidebarCollapsed && "lg:pl-14",
            )}
          >
            <EmptyState onPrompt={(t) => void chat.send(t)}>
              <Composer
                placement="center"
                onSend={(t) => void chat.send(t)}
                onStop={chat.stop}
                streaming={chat.streaming}
              />
            </EmptyState>
          </div>
        ) : (
          <div
            className={cn(
              "relative isolate min-h-0 flex-1",
              sidebarCollapsed && "lg:pl-14",
            )}
          >
            <MessageList
              messages={chat.messages}
              statusMessage={chat.statusMessage}
              onRetry={chat.retryLast}
            />
            {/* Full-pane fades — sit above transcript, under composer/chrome */}
            <div className="chat-fade-top" aria-hidden />
            <div className="chat-fade-bottom" aria-hidden />
            <Composer
              placement="bottom"
              onSend={(t) => void chat.send(t)}
              onStop={chat.stop}
              streaming={chat.streaming}
            />
          </div>
        )}
      </motion.div>
    </AppShell>
  );
}
