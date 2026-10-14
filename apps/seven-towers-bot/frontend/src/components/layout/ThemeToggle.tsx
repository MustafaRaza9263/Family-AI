"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex rounded-md border border-border bg-surface-2 p-1"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={preference === value}
          aria-label={label}
          onClick={() => setPreference(value)}
          className={cn(
            "inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-sm px-2",
            preference === value
              ? "bg-surface text-text"
              : "text-muted hover:text-text",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
