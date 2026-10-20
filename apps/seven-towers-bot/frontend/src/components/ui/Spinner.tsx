"use client";

import { cn } from "@/lib/cn";

type SpinnerProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-10 border-[3px]",
} as const;

export function Spinner({
  className,
  label = "Loading",
  size = "md",
}: SpinnerProps) {
  return (
    <span
      role="status"
      className={cn(
        "inline-block animate-spin rounded-full border-muted border-t-accent",
        sizeClass[size],
        className,
      )}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}
