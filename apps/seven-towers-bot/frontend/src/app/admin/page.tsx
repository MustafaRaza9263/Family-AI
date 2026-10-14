"use client";

import Link from "next/link";
import { useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { AdminAuditPanel } from "@/components/admin/AdminAuditPanel";
import { toastAdminApiError } from "@/components/admin/adminApiToast";
import { adminApi } from "@/lib/api-admin";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type AdminTab = "users" | "audit";

function AdminHome() {
  const { toast } = useToast();
  const [tab, setTab] = useState<AdminTab>("users");
  const [reloadBusy, setReloadBusy] = useState(false);

  async function reloadKnowledge() {
    setReloadBusy(true);
    try {
      const res = await adminApi.reloadKnowledge();
      toast(`Reloaded ${res.projectIds.length} knowledge project(s).`, "success");
    } catch (err: unknown) {
      toastAdminApiError(toast, err, "Knowledge reload failed.");
    } finally {
      setReloadBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm text-muted hover:text-text">
              ← Back to chat
            </Link>
            <h1 className="text-xl font-semibold text-text">Admin</h1>
          </div>
          <Button variant="secondary" disabled={reloadBusy} onClick={() => void reloadKnowledge()}>
            {reloadBusy ? "Reloading…" : "Reload knowledge"}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex gap-2 border-b border-border">
          {(
            [
              ["users", "Users"],
              ["audit", "Audit"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "min-h-[44px] border-b-2 px-4 text-sm font-medium",
                tab === key
                  ? "border-accent text-text"
                  : "border-transparent text-muted hover:text-text",
              )}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "users" ? <AdminUsersPanel /> : <AdminAuditPanel />}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AdminHome />
      </RequireAdmin>
    </RequireAuth>
  );
}
