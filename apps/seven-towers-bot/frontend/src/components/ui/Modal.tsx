"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-surface p-0 text-text",
        "backdrop:bg-bg/80",
        className,
      )}
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 id="modal-title" className="text-lg font-semibold text-text">
          {title}
        </h2>
        <div aria-labelledby="modal-title">{children}</div>
      </div>
    </dialog>
  );
}
