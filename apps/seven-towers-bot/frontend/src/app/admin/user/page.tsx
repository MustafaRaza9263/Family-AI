"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AdminUserPageContent } from "@/components/admin/AdminUserPageContent";
import { Spinner } from "@/components/ui/Spinner";

function AdminUserRoute() {
  const params = useSearchParams();
  const userId = params.get("id") ?? "";
  return <AdminUserPageContent userId={userId} />;
}

export default function AdminUserPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <div className="min-h-dvh bg-bg">
          <header className="border-b border-border bg-surface px-4 py-4">
            <Link href="/admin/" className="text-sm text-muted hover:text-text">
              ← Admin users
            </Link>
          </header>
          <main className="mx-auto max-w-3xl px-4 py-6">
            <Suspense
              fallback={
                <div className="flex justify-center py-16">
                  <Spinner size="lg" />
                </div>
              }
            >
              <AdminUserRoute />
            </Suspense>
          </main>
        </div>
      </RequireAdmin>
    </RequireAuth>
  );
}
