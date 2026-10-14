"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={user.fullName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{user.fullName}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>
      <ThemeToggle />
      <div className="flex flex-col gap-1">
        <Link
          href="/change-password/"
          className="rounded-md px-2 py-2 text-sm text-text hover:bg-surface-2"
        >
          Change password
        </Link>
        {user.role === "admin" ? (
          <Link
            href="/admin/"
            className="rounded-md px-2 py-2 text-sm text-text hover:bg-surface-2"
          >
            Admin
          </Link>
        ) : null}
        <Button variant="ghost" className="justify-start px-2" onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </div>
  );
}
