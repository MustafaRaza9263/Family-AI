import { PRODUCT_NAME } from '@studio/shared';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function BrandMark({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const text =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <Link
      href="/"
      className={cn(
        'whitespace-nowrap font-semibold tracking-tight text-foreground',
        text,
        className,
      )}
    >
      {PRODUCT_NAME}
    </Link>
  );
}
