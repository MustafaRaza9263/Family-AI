"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export type AdminNavTab = "users" | "audit" | "gaps";

type AdminNavProps = {
  active: AdminNavTab;
  /** When set (on /admin/), Users/Audit switch in-page without navigation. */
  onSelect?: (tab: "users" | "audit") => void;
};

/**
 * Shared admin tabs. Users/Audit live on /admin/ (client state);
 * Unknowns is its own static-export page at /admin/gaps/.
 */
export function AdminNav({ active, onSelect }: AdminNavProps) {
  const inAdminHome = active === "users" || active === "audit";

  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-border">
      {inAdminHome && onSelect ? (
        <TabButton
          label="Users"
          active={active === "users"}
          onClick={() => onSelect("users")}
        />
      ) : (
        <TabLink label="Users" active={active === "users"} href="/admin/" />
      )}
      {inAdminHome && onSelect ? (
        <TabButton
          label="Audit"
          active={active === "audit"}
          onClick={() => onSelect("audit")}
        />
      ) : (
        <TabLink
          label="Audit"
          active={active === "audit"}
          href="/admin/?tab=audit"
        />
      )}
      <TabLink label="Unknowns" active={active === "gaps"} href="/admin/gaps/" />
    </div>
  );
}

function tabClass(active: boolean): string {
  return cn(
    "min-h-[44px] border-b-2 px-4 text-sm font-medium",
    active
      ? "border-accent text-text"
      : "border-transparent text-muted hover:text-text",
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={tabClass(active)} onClick={onClick}>
      {label}
    </button>
  );
}

function TabLink({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link href={href} className={cn(tabClass(active), "inline-flex items-center")}>
      {label}
    </Link>
  );
}
