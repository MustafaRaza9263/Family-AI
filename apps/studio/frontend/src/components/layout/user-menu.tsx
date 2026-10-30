'use client';

import type { PublicUser } from '@studio/shared';
import { LogOut, Monitor, Moon, Sun, User } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/features/auth/hooks';
import { cn } from '@/lib/cn';

export function UserMenu({
  user,
  fullWidth = false,
  avatarOnly = false,
}: {
  user: PublicUser;
  fullWidth?: boolean;
  avatarOnly?: boolean;
}) {
  const logout = useLogout();
  const { theme, setTheme } = useTheme();

  const themeLabel =
    theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] p-1.5 hover:bg-surface-muted',
            fullWidth && 'w-full min-w-0',
          )}
          aria-label="User menu"
        >
          <Avatar name={user.fullName} />
          {avatarOnly ? null : (
            <span className="min-w-0 truncate text-left text-sm font-medium">
              {user.fullName}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={avatarOnly ? 'end' : 'start'}
        side="top"
        className="w-56"
      >
        <div className="border-b border-border px-3 py-2">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuItem
          className="w-full"
          onSelect={(e) => {
            e.preventDefault();
            cycleTheme();
          }}
        >
          <ThemeIcon className="size-4" />
          {themeLabel}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/">
            <User className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
