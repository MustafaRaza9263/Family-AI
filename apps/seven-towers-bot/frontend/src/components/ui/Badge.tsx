import { cn } from "@/lib/cn";

export type BadgeVariant = "active" | "disabled" | "admin" | "user";

export type BadgeProps = {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
};

const variantClass: Record<BadgeVariant, string> = {
  active: "bg-surface-2 text-success",
  disabled: "bg-surface-2 text-muted",
  admin: "bg-accent text-accent-text",
  user: "bg-surface-2 text-text",
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
