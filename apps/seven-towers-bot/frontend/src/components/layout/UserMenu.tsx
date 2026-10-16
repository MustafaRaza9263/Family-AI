"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronUp, KeyRound, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./ThemeToggle";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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
            <p className="mb-2 text-xs font-medium text-muted">Theme</p>
            <ThemeToggle />
          </div>

          <div className="flex flex-col p-1">
            <Link
              href="/change-password/"
              role="menuitem"
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-text hover:bg-surface-2"
              onClick={() => setOpen(false)}
            >
              <KeyRound className="size-4 text-muted" aria-hidden />
              Change password
            </Link>
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
                void logout();
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
    </div>
  );
}
