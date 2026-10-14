"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/api-auth";
import { messageForErrorCode } from "@/lib/errors-ui";

export function ChangePasswordForm() {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      await refresh();
      toast("Password updated.", "success");
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(messageForErrorCode(err.code, err.message));
      } else {
        setFormError(messageForErrorCode("NETWORK"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <h2 className="text-lg font-medium text-text">Change password</h2>
      <p className="text-sm text-muted">
        Choose a new password before continuing.
      </p>
      {formError ? (
        <p className="text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(ev) => setCurrentPassword(ev.target.value)}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        value={newPassword}
        onChange={(ev) => setNewPassword(ev.target.value)}
      />
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
