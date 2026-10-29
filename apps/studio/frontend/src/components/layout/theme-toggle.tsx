'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const label =
    theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
