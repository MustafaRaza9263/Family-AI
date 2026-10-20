"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { messageForErrorCode } from "@/lib/errors-ui";
import { streamChat } from "@/lib/sse-client";
import { applyStreamFailure, consumeChatStream } from "./chat-stream";
import { createOptimisticMessages } from "./chat-stream-buffer";
import { useChatHistory } from "./useChatHistory";

type UseChatOptions = {
  onConversationCreated?: (id: string) => void;
};

export function useChat(
  conversationId: string | null,
  { onConversationCreated }: UseChatOptions = {},
) {
  const abortRef = useRef<AbortController | null>(null);
  const lastSendRef = useRef("");
  const [streaming, setStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  const { messages, setMessages, loading, error, setError } = useChatHistory(
    conversationId,
    stop,
    streaming,
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      lastSendRef.current = trimmed;
      setError(null);
      setStatusMessage("");

      const { user, assistant } = createOptimisticMessages(trimmed);
      setMessages((prev) => [...prev, user, assistant]);

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      try {
        const outcome = await consumeChatStream({
          stream: streamChat({
            conversationId: conversationId ?? undefined,
            message: trimmed,
            signal: controller.signal,
          }),
          userTempId: user.id,
          assistantTempId: assistant.id,
          setMessages,
          onConversationId: onConversationCreated,
        });
        if (outcome === "ok") {
          setStatusMessage("Assistant finished responding.");
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        const code = err instanceof ApiError ? err.code : "NETWORK";
        const msg = err instanceof ApiError ? err.message : "Stream failed";
        applyStreamFailure(setMessages, assistant.id, code, msg);
        setError(messageForErrorCode(code, msg));
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [
      conversationId,
      onConversationCreated,
      setError,
      setMessages,
      streaming,
    ],
  );

  const retryLast = useCallback(() => {
    if (!lastSendRef.current) return;
    setMessages((prev) => (prev.length >= 2 ? prev.slice(0, -2) : prev));
    void send(lastSendRef.current);
  }, [send, setMessages]);

  return {
    messages,
    send,
    stop,
    retryLast,
    loading,
    streaming,
    statusMessage,
    error,
  };
}
