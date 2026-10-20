"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { UserDetail } from "@/components/admin/UserDetail";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { useAdminUserMutations } from "@/components/admin/useAdminUserMutations";
import { toastAdminApiError } from "@/components/admin/adminApiToast";
import { adminApi } from "@/lib/api-admin";
import type { AdminUserDetail, Conversation } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

type AdminUserLoaderProps = {
  userId: string;
};

function AdminUserLoader({ userId }: AdminUserLoaderProps) {
  const { toast } = useToast();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [u, chats] = await Promise.all([
      adminApi.getUser(userId),
      adminApi.getUserConversations(userId),
    ]);
    setUser(u.user);
    setConversations(chats.items);
  }, [userId]);

  const mutations = useAdminUserMutations(user, reload);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch (err: unknown) {
        if (cancelled) return;
        toastAdminApiError(toast, err, "Could not load user.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload, toast]);

  if (loading || !user) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <UserDetail
        user={user}
        conversations={conversations}
        statusBusy={mutations.statusBusy}
        roleBusy={mutations.roleBusy}
        passwordBusy={mutations.passwordBusy}
        onDisable={mutations.onDisable}
        onEnable={mutations.onEnable}
        onMakeAdmin={mutations.onMakeAdmin}
        onRemoveAdmin={mutations.onRemoveAdmin}
        onResetPassword={mutations.onResetPassword}
      />
      {mutations.tempPassword ? (
        <ResetPasswordDialog
          open
          temporaryPassword={mutations.tempPassword}
          onClose={mutations.clearTempPassword}
        />
      ) : null}
    </>
  );
}

export function AdminUserPageContent({ userId }: { userId: string }) {
  if (!userId) {
    return (
      <p className="text-sm text-danger">
        Missing user id.{" "}
        <Link href="/admin/" className="text-accent underline">
          Back to admin
        </Link>
      </p>
    );
  }

  return <AdminUserLoader key={userId} userId={userId} />;
}
