"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminGapsPanel } from "@/components/admin/AdminGapsPanel";
import { AdminNav } from "@/components/admin/AdminNav";

function AdminGapsHome() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="text-sm text-muted hover:text-text">
            ← Back to chat
          </Link>
          <h1 className="text-xl font-semibold text-text">Admin</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav active="gaps" />
        <AdminGapsPanel />
      </main>
    </div>
  );
}

export default function AdminGapsPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AdminGapsHome />
      </RequireAdmin>
    </RequireAuth>
  );
}
