"use client";

import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { Modal } from "@/components/ui/Modal";

export type ChangePasswordDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ChangePasswordDialog({
  open,
  onClose,
}: ChangePasswordDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Change password">
      <ChangePasswordForm hideHeading onSuccess={onClose} />
    </Modal>
  );
}
