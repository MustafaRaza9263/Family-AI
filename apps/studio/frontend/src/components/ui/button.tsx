'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:brightness-110',
        secondary:
          'bg-surface-muted text-foreground hover:bg-border/60',
        ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
        danger: 'bg-danger text-white hover:brightness-110',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-4',
        lg: 'h-12 px-5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
