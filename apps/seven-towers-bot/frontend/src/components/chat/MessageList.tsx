"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { MessageItem } from "./MessageItem";
import { ScrollToBottom } from "./ScrollToBottom";

type MessageListProps = {
  messages: Message[];
  statusMessage: string;
  onRetry?: () => void;
};

const BOTTOM_THRESHOLD_PX = 80;

export function MessageList({
  messages,
  statusMessage,
  onRetry,
}: MessageListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stickRef.current = true;
    setShowJump(false);
  }, []);

  useEffect(() => {
    if (!stickRef.current) return;
    scrollToBottom("auto");
  }, [messages, scrollToBottom]);

  const onScroll = (): void => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance <= BOTTOM_THRESHOLD_PX;
    stickRef.current = atBottom;
    setShowJump(!atBottom);
  };

  return (
    <div className="absolute inset-0">
      {/*
        Full-pane scrollport (not just the text column) so wheel/touch
        anywhere on the screen scrolls the transcript.
      */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="h-full w-full overflow-y-auto overscroll-contain scrollbar-none"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-28 pt-[max(7.25rem,calc(env(safe-area-inset-top)+5.75rem))] lg:pb-28 lg:pt-28">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} onRetry={onRetry} />
          ))}
        </div>
      </div>
      <ScrollToBottom visible={showJump} onClick={() => scrollToBottom()} />
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
