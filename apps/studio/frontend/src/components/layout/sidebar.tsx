'use client';

import type { PublicUser, ThreadDto } from '@studio/shared';
import { ImagePlus, Images, Shield, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandMark } from './brand-mark';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/cn';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: '/create/?tool=image', label: 'New image', icon: ImagePlus },
  { href: '/library/', label: 'Library', icon: Images },
  { href: '/admin/', label: 'Admin', icon: Shield, adminOnly: true },
];

export function Sidebar({
  user,
  threads,
}: {
  user: PublicUser;
  threads: ThreadDto[];
}) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.adminOnly || user.role === 'admin');

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-background">
      <div className="px-4 pt-4 pb-3">
        <BrandMark size="sm" />
      </div>

      <nav className="flex flex-col gap-0.5 px-2" aria-label="Main">
        {items.map((item) => {
          const active = item.href.startsWith('/create')
            ? pathname.startsWith('/create')
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium transition duration-200',
                active
                  ? 'bg-surface-muted text-foreground'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {threads.length > 0 ? (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto scrollbar-none px-2">
          <p className="mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recent
          </p>
          <ul className="space-y-0.5">
            {threads.slice(0, 12).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/create/?tool=image&thread=${t.id}`}
                  className="block truncate rounded-[var(--radius-control)] px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                >
                  {t.title || 'Untitled'}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-auto border-t border-border p-3">
        <UserMenu user={user} fullWidth />
      </div>
    </aside>
  );
}
