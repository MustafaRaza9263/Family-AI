"use client";

import { useEffect, useState } from "react";
import type { KnowledgeGapItem, KnowledgeGapStatus } from "@/lib/types";
import { toastAdminApiError } from "@/components/admin/adminApiToast";
import { adminApi } from "@/lib/api-admin";
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 50;

export function useAdminGapsList() {
  const { toast } = useToast();
  const [status, setStatus] = useState<KnowledgeGapStatus>("open");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<KnowledgeGapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminApi.listGaps({ status, page });
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      } catch (err: unknown) {
        if (cancelled) return;
        toastAdminApiError(toast, err, "Could not load unknowns.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, page, toast, reloadToken]);

  async function setGapStatus(id: string, next: KnowledgeGapStatus) {
    setBusyId(id);
    try {
      await adminApi.updateGap(id, next);
      toast(
        next === "resolved"
          ? "Marked resolved."
          : next === "ignored"
            ? "Marked ignored."
            : "Reopened.",
        "success",
      );
      setLoading(true);
      setReloadToken((n) => n + 1);
    } catch (err: unknown) {
      toastAdminApiError(toast, err, "Could not update gap.");
    } finally {
      setBusyId(null);
    }
  }

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    status,
    setStatus: (s: KnowledgeGapStatus) => {
      setPage(1);
      setLoading(true);
      setStatus(s);
    },
    page,
    setPage,
    total,
    maxPage,
    items,
    loading,
    busyId,
    setGapStatus,
  };
}
