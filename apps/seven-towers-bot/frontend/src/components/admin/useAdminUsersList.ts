"use client";

import { useEffect, useState } from "react";
import type { AccountStatus, AdminUserListItem } from "@/lib/types";
import { toastAdminApiError } from "@/components/admin/adminApiToast";
import { adminApi } from "@/lib/api-admin";
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export type StatusFilter = "all" | AccountStatus;

export function useAdminUsersList() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(search.trim());
      setPage(1);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminApi.listUsers({
          query: debouncedQuery || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          page,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      } catch (err: unknown) {
        if (cancelled) return;
        toastAdminApiError(toast, err, "Could not load users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, statusFilter, page, toast]);

  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function setStatusFilterAndReset(next: StatusFilter) {
    setStatusFilter(next);
    setPage(1);
  }

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter: setStatusFilterAndReset,
    page,
    setPage,
    total,
    items,
    loading,
    maxPage,
  };
}
