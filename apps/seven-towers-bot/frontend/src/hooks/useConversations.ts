"use client";

import { useCallback, useEffect, useState } from "react";
import { chatApi } from "@/lib/api-chat";
import type { Conversation } from "@/lib/types";

const PAGE_SIZE = 30;

export function useConversations() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.listConversations({ limit: PAGE_SIZE });
      setItems(res.items);
      setNextBefore(res.nextBefore);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await chatApi.listConversations({
        limit: PAGE_SIZE,
        before: nextBefore,
      });
      setItems((prev) => [...prev, ...res.items]);
      setNextBefore(res.nextBefore);
    } finally {
      setLoadingMore(false);
    }
  }, [nextBefore, loadingMore]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await chatApi.listConversations({ limit: PAGE_SIZE });
        if (cancelled) return;
        setItems(res.items);
        setNextBefore(res.nextBefore);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    items,
    nextBefore,
    loading,
    loadingMore,
    refresh,
    loadMore,
  };
}
