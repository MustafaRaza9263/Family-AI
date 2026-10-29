'use client';

import type { PublicUser } from '@studio/shared';
import { LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from './theme-toggle';
import { useLogout } from '@/features/auth/hooks';

export function UserMenu({ user }: { user: PublicUser }) {
  const logout = useLogout();

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-[var(--radius-control)] p-1.5 hover:bg-surface-muted"
            aria-label="User menu"
          >
            <Avatar name={user.fullName} />
            <span className="hidden max-w-40 truncate text-left text-sm md:block">
              <span className="block font-medium">{user.fullName}</span>
              <span className="block text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
