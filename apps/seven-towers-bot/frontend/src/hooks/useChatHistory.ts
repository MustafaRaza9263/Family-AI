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
 *
 * On reload with ?c= already in the URL, conversationId is set on the first
 * render. We must still fetch — so "same id" skip only applies after a prior
 * effect run has synced that id (not on the initial undefined state).
 */
export function useChatHistory(
  conversationId: string | null,
  onSwitch: () => void,
  streaming: boolean,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  // Show spinner immediately when restoring from ?c= (avoids empty-state flash).
  const [loading, setLoading] = useState(() => Boolean(conversationId));
  const [error, setError] = useState<string | null>(null);
  /** undefined = never synced (covers initial mount / Strict Mode remount). */
  const syncedIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const previousId = syncedIdRef.current;

    // Same conversation after we've already synced — e.g. streaming flipped
    // to false after meta URL sync.
    if (previousId !== undefined && previousId === conversationId) {
      return;
    }

    // First reply: URL gained ?c= while the stream is still open.
    if (previousId === null && conversationId && streaming) {
      syncedIdRef.current = conversationId;
      return;
    }

    const previousSynced = previousId;
    syncedIdRef.current = conversationId;
    onSwitch();
    let cancelled = false;
    let completed = false;

    void (async () => {
      if (!conversationId) {
        if (!cancelled) {
          setMessages([]);
          setLoading(false);
          setError(null);
          completed = true;
        }
        return;
      }

      if (!cancelled) setLoading(true);
      try {
        const res = await chatApi.getConversation(conversationId);
        if (cancelled || syncedIdRef.current !== conversationId) return;
        setMessages(res.messages);
        setError(null);
        completed = true;
      } catch (err: unknown) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? messageForErrorCode(err.code, err.message)
            : messageForErrorCode("NETWORK"),
        );
        setMessages([]);
        completed = true;
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      // Strict Mode remounts cancel the in-flight fetch; revert so the next
      // effect run does not treat the id as already loaded.
      if (!completed) {
        syncedIdRef.current = previousSynced;
      }
    };
  }, [conversationId, onSwitch, streaming]);

  return { messages, setMessages, loading, error, setError };
}
