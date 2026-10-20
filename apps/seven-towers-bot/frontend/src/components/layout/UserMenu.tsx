"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronUp, KeyRound, LogOut, Shield } from "lucide-react";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./ThemeToggle";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const handleConfirmLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  }, [logout]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={rootRef}>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-lg bg-surface-2"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={user.fullName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {user.fullName}
              </p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>

          <div className="px-3 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Theme
            </p>
            <ThemeToggle />
          </div>

          <div className="flex flex-col p-1">
            <button
              type="button"
              role="menuitem"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-text hover:bg-surface-2"
              onClick={() => {
                setOpen(false);
                setChangePasswordOpen(true);
              }}
            >
              <KeyRound className="size-4 text-muted" aria-hidden />
              Change password
            </button>
            {user.role === "admin" ? (
              <Link
                href="/admin/"
                role="menuitem"
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-text hover:bg-surface-2"
                onClick={() => setOpen(false)}
              >
                <Shield className="size-4 text-muted" aria-hidden />
                Admin
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-danger hover:bg-surface-2"
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left",
          "hover:bg-surface-2",
          open && "bg-surface-2",
        )}
      >
        <Avatar name={user.fullName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{user.fullName}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <ChevronUp
          className={cn(
            "size-4 shrink-0 text-muted transition-transform",
            open ? "rotate-0" : "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          void handleConfirmLogout();
        }}
        title="Log out?"
        description="You will need to sign in again to continue."
        confirmLabel={loggingOut ? "Logging out…" : "Log out"}
        confirming={loggingOut}
      />
    </div>
  );
}
