"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

type ThemeToggleProps = {
  /** Smaller circular hits for glass mobile chrome. */
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        "flex p-1",
        compact
          ? "gap-0.5"
          : "rounded-md border border-border bg-surface-2",
      )}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={preference === value}
          aria-label={label}
          onClick={() => setPreference(value)}
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            compact ? "size-8" : "min-h-[36px] min-w-[36px] rounded-sm px-2",
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
