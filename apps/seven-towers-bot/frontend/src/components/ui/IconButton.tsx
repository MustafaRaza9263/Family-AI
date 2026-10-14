"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";

export type IconButtonProps = {
  label: string;
  className?: string;
  children: React.ReactNode;
} & Omit<HTMLMotionProps<"button">, "children" | "aria-label">;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, className, children, type = "button", disabled, ...rest },
    ref,
  ) {
    return (
      <motion.button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-md text-muted",
          "hover:bg-surface-2 hover:text-text disabled:opacity-40",
          className,
        )}
        {...rest}
      >
        {children}
      </motion.button>
    );
  },
);
