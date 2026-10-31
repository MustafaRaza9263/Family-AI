'use client';

import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/spinner';

export function SubmitButton({
  disabled,
  loading,
}: {
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="submit"
      aria-label="Generate"
      data-tip="Generate · Enter"
      data-tip-align="end"
      disabled={disabled || loading}
      className={cn(
        'grid size-[34px] place-items-center rounded-full text-[#001018]',
        'bg-gradient-to-br from-sky-300 via-sky-400 to-sky-500',
        'shadow-[0_0_18px_-2px_color-mix(in_srgb,var(--primary)_45%,transparent)]',
        'transition-[transform,opacity,box-shadow,filter] duration-150',
        'hover:enabled:-translate-y-px hover:enabled:shadow-[0_0_24px_0_color-mix(in_srgb,var(--primary)_45%,transparent)]',
        'active:enabled:scale-[0.94]',
        'disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none disabled:grayscale',
      )}
    >
      {loading ? (
        <Spinner className="size-4" />
      ) : (
        <ArrowUp className="size-4" strokeWidth={2.5} />
      )}
    </button>
  );
}
