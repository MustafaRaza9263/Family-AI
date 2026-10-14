"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { chatApi } from "@/lib/api-chat";
import { messageForErrorCode } from "@/lib/errors-ui";
import type { Message } from "@/lib/types";

/**
 * Loads history when the user switches conversations.
 * Skips abort+reload on null→id while `streaming` (first-message SSE meta
 * updates the URL mid-stream; reloading would wipe tokens and abort).
 */
export function useChatHistory(
  conversationId: string | null,
  onSwitch: () => void,
  streaming: boolean,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef(conversationId);

  useEffect(() => {
    const previousId = activeRef.current;

    // Same conversation — e.g. streaming flipped to false after meta URL sync.
    if (previousId === conversationId) {
      return;
    }

    // First reply: URL gained ?c= while the stream is still open.
    if (previousId === null && conversationId && streaming) {
      activeRef.current = conversationId;
      return;
    }

    activeRef.current = conversationId;
    onSwitch();
    let cancelled = false;

    void (async () => {
      if (!conversationId) {
        if (!cancelled) {
          setMessages([]);
          setLoading(false);
          setError(null);
        }
        return;
      }

      if (!cancelled) setLoading(true);
      try {
        const res = await chatApi.getConversation(conversationId);
        if (cancelled || activeRef.current !== conversationId) return;
        setMessages(res.messages);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? messageForErrorCode(err.code, err.message)
            : messageForErrorCode("NETWORK"),
        );
        setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, onSwitch, streaming]);

  return { messages, setMessages, loading, error, setError };
}
