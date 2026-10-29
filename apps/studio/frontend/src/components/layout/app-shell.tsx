'use client';

import type { PublicUser } from '@studio/shared';
import { Home, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BrandMark } from './brand-mark';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/cn';

const nav = [
  { href: '/', label: 'Home', icon: Home, adminOnly: false },
  { href: '/admin/users/', label: 'Users', icon: Users, adminOnly: true },
] as const;

export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const items = nav.filter((item) => !item.adminOnly || user.role === 'admin');

  return (
    <div className="min-h-dvh bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="mx-auto flex min-h-dvh max-w-6xl gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-6 space-y-6">
            <BrandMark size="sm" />
            <nav className="flex flex-col gap-1" aria-label="Main">
              {items.map((item) => {
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium transition duration-200',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mb-6 flex items-center justify-between gap-3 md:justify-end">
            <div className="md:hidden">
              <BrandMark size="sm" />
            </div>
            <UserMenu user={user} />
          </header>
          <main className="flex-1 pb-8">{children}</main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Mobile"
      >
        <ul className="mx-auto flex max-w-lg">
          {items.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
