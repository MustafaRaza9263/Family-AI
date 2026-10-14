"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { Transcript } from "@/components/admin/Transcript";
import { toastAdminApiError } from "@/components/admin/adminApiToast";
import { adminApi } from "@/lib/api-admin";
import type { Conversation, Message } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

function AdminChatLoader({ conversationId }: { conversationId: string }) {
  const { toast } = useToast();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminApi.getConversation(conversationId);
        if (cancelled) return;
        setConversation(res.conversation);
        setMessages(res.messages);
      } catch (err: unknown) {
        if (cancelled) return;
        toastAdminApiError(toast, err, "Could not load conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, toast]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-text">
        {conversation?.title ?? "Conversation"}
      </h1>
      <Transcript messages={messages} />
    </div>
  );
}

function AdminChatRoute() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  if (!id) {
    return (
      <p className="text-sm text-danger">
        Missing conversation id.{" "}
        <Link href="/admin/" className="text-accent underline">
          Back to admin
        </Link>
      </p>
    );
  }
  return <AdminChatLoader key={id} conversationId={id} />;
}

export default function AdminChatPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <div className="min-h-dvh bg-bg">
          <header className="border-b border-border bg-surface px-4 py-4">
            <Link href="/admin/" className="text-sm text-muted hover:text-text">
              ← Admin
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
              <AdminChatRoute />
            </Suspense>
          </main>
        </div>
      </RequireAdmin>
    </RequireAuth>
  );
}
