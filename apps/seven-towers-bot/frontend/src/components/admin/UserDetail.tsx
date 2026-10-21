"use client";

import Link from "next/link";
import type { AdminUserDetail, Conversation } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type UserDetailProps = {
  user: AdminUserDetail;
  conversations: Conversation[];
  statusBusy: boolean;
  roleBusy: boolean;
  passwordBusy: boolean;
  onDisable: () => void;
  onEnable: () => void;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onResetPassword: () => void;
};

export function UserDetail({
  user,
  conversations,
  statusBusy,
  roleBusy,
  passwordBusy,
  onDisable,
  onEnable,
  onMakeAdmin,
  onRemoveAdmin,
  onResetPassword,
}: UserDetailProps) {
  const isActive = user.status === "active";
  const isPending = user.status === "pending";
  const isAdmin = user.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar name={user.fullName} className="size-12 text-sm" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-text">{user.fullName}</h1>
            <Badge variant={user.status}>{user.status}</Badge>
            <Badge variant={isAdmin ? "admin" : "user"}>{user.role}</Badge>
          </div>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-sm text-muted">{user.phone}</p>
          <p className="text-xs text-muted">
            Joined {relativeTime(user.createdAt)}
            {user.lastLoginAt
              ? ` · Last login ${relativeTime(user.lastLoginAt)}`
              : " · Never signed in"}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {isActive ? (
            <Button variant="danger" disabled={statusBusy} onClick={onDisable}>
              Disable account
            </Button>
          ) : isPending ? (
            <Button disabled={statusBusy} onClick={onEnable}>
              Approve account
            </Button>
          ) : (
            <Button disabled={statusBusy} onClick={onEnable}>
              Enable account
            </Button>
          )}
          {isAdmin ? (
            <Button variant="secondary" disabled={roleBusy} onClick={onRemoveAdmin}>
              Remove admin
            </Button>
          ) : (
            <Button variant="secondary" disabled={roleBusy} onClick={onMakeAdmin}>
              Make admin
            </Button>
          )}
          <Button variant="secondary" disabled={passwordBusy} onClick={onResetPassword}>
            Reset password
          </Button>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Conversations</h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted">No conversations yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/chat/?id=${c.id}`}
                  className="flex flex-col gap-0.5 px-4 py-3 hover:bg-surface-2"
                >
                  <span className="text-sm font-medium text-text">{c.title}</span>
                  <span className="text-xs text-muted">
                    Updated {relativeTime(c.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
