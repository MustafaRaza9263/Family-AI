import { cn } from "@/lib/cn";

export type CardProps = {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, style, ...rest }: CardProps) {
  return (
    <div
      className={cn("rounded-md border border-border bg-surface p-4", className)}
      style={{ boxShadow: "var(--shadow)", ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
