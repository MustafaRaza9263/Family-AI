"use client";

import { useState } from "react";
import { toastAdminApiError } from "@/components/admin/adminApiToast";
import { adminApi } from "@/lib/api-admin";
import type { AdminUserDetail, WritableAccountStatus } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

type ReloadFn = () => Promise<void>;

export function useAdminUserMutations(user: AdminUserDetail | null, reload: ReloadFn) {
  const { toast } = useToast();
  const [statusBusy, setStatusBusy] = useState(false);
  const [roleBusy, setRoleBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function patchStatus(status: WritableAccountStatus) {
    if (!user) return;
    setStatusBusy(true);
    try {
      await adminApi.setStatus(user.id, status);
      const message =
        status === "disabled"
          ? "Account disabled."
          : user.status === "pending"
            ? "Account approved."
            : "Account enabled.";
      toast(message, "success");
      await reload();
    } catch (err: unknown) {
      toastAdminApiError(toast, err);
    } finally {
      setStatusBusy(false);
    }
  }

  async function patchRole(role: "user" | "admin") {
    if (!user) return;
    setRoleBusy(true);
    try {
      await adminApi.setRole(user.id, role);
      toast(role === "admin" ? "User is now admin." : "Admin role removed.", "success");
      await reload();
    } catch (err: unknown) {
      toastAdminApiError(toast, err);
    } finally {
      setRoleBusy(false);
    }
  }

  async function resetPassword() {
    if (!user) return;
    setPasswordBusy(true);
    try {
      const res = await adminApi.resetPassword(user.id);
      if (res.temporaryPassword) setTempPassword(res.temporaryPassword);
      toast("Password reset.", "success");
      await reload();
    } catch (err: unknown) {
      toastAdminApiError(toast, err);
    } finally {
      setPasswordBusy(false);
    }
  }

  return {
    statusBusy,
    roleBusy,
    passwordBusy,
    tempPassword,
    clearTempPassword: () => setTempPassword(null),
    onDisable: () => void patchStatus("disabled"),
    onEnable: () => void patchStatus("active"),
    onMakeAdmin: () => void patchRole("admin"),
    onRemoveAdmin: () => void patchRole("user"),
    onResetPassword: () => void resetPassword(),
  };
}
