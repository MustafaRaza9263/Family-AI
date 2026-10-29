import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        pending: 'bg-warning/15 text-warning',
        active: 'bg-success/15 text-success',
        disabled: 'bg-muted-foreground/15 text-muted-foreground',
      },
    },
    defaultVariants: {
      status: 'pending',
    },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, status, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ status }), className)} {...props} />
  );
}
