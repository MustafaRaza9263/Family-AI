"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/types";
import { toastAdminApiError } from "@/components/admin/adminApiToast";
import { adminApi } from "@/lib/api-admin";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { AuditTable } from "./AuditTable";

const PAGE_SIZE = 50;

export function AdminAuditPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminApi.listAudit({ limit: PAGE_SIZE });
        if (cancelled) return;
        setItems(res.items);
        setHasMore(res.items.length >= PAGE_SIZE);
      } catch (err: unknown) {
        if (cancelled) return;
        toastAdminApiError(toast, err, "Could not load audit log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function loadMore() {
    const last = items[items.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await adminApi.listAudit({
        limit: PAGE_SIZE,
        before: last.at,
      });
      setItems((prev) => [...prev, ...res.items]);
      setHasMore(res.items.length >= PAGE_SIZE);
    } catch (err: unknown) {
      toastAdminApiError(toast, err, "Could not load more entries.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AuditTable items={items} loading={loading} />
      {hasMore ? (
        <Button
          variant="secondary"
          disabled={loading || loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
