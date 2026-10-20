"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { IconButton } from "@/components/ui/IconButton";
import { CHROME_ICON, spring } from "@/lib/motion";
import { cn } from "@/lib/cn";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const ORDER: ThemePreference[] = ["system", "light", "dark"];

function nextTheme(current: ThemePreference): ThemePreference {
  const index = ORDER.indexOf(current);
  return ORDER[(index + 1) % ORDER.length] ?? "system";
}

type ThemeToggleProps = {
  /** Floating chrome: one glass circle matching other header icons. */
  compact?: boolean;
};

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();

  if (compact) {
    const active = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[0];
    const Icon = active.icon;
    const next = nextTheme(preference);
    const nextLabel =
      OPTIONS.find((o) => o.value === next)?.label ?? next;
    const aria = `Theme: ${active.label}. Click for ${nextLabel}`;

    return (
      <IconButton
        label={aria}
        className={CHROME_ICON}
        onClick={() => setPreference(next)}
      >
        <Icon className="size-5" />
      </IconButton>
    );
  }

  const activeIndex = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === preference),
  );

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="relative flex rounded-lg border border-border bg-bg p-[3px]"
    >
      <motion.div
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-[3px] rounded-md bg-surface"
        style={{
          width: "calc((100% - 6px) / 3)",
          boxShadow: "var(--shadow)",
        }}
        initial={false}
        animate={{ x: `${activeIndex * 100}%` }}
        transition={spring}
      />
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            onClick={() => setPreference(opt.value)}
            className={cn(
              "relative z-10 flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md py-1.5",
              "text-xs font-medium transition-colors",
              active ? "font-semibold text-text" : "text-muted hover:text-text",
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
