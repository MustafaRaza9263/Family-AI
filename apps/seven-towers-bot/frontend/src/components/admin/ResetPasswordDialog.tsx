"use client";

import { useCallback } from "react";
import { copyText } from "@/lib/errors-ui";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type ResetPasswordDialogProps = {
  open: boolean;
  temporaryPassword: string;
  onClose: () => void;
};

export function ResetPasswordDialog({
  open,
  temporaryPassword,
  onClose,
}: ResetPasswordDialogProps) {
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    const ok = await copyText(temporaryPassword);
    toast(ok ? "Copied to clipboard." : "Could not copy.", ok ? "success" : "danger");
  }, [temporaryPassword, toast]);

  return (
    <Modal open={open} onClose={onClose} title="Temporary password">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Share this password securely. The user must change it on next sign-in.
        </p>
        <p className="rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text">
          {temporaryPassword}
        </p>
        <p className="text-sm text-danger">
          Do not store this password in chat or email unless your policy allows it.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleCopy()}>
            Copy password
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
