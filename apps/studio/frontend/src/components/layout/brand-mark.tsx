import { PRODUCT_NAME } from '@studio/shared';
import { cn } from '@/lib/cn';

export function BrandMark({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box =
    size === 'lg' ? 'size-12' : size === 'sm' ? 'size-8' : 'size-10';
  const text =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn('rounded-2xl shadow-sm', box)}
        style={{ backgroundImage: 'var(--gradient-brand)' }}
        aria-hidden
      />
      <span className={cn('font-semibold tracking-tight text-foreground', text)}>
        {PRODUCT_NAME}
      </span>
    </div>
  );
}
