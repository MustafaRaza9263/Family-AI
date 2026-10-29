import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground',
        className,
      )}
      style={{ backgroundImage: 'var(--gradient-brand)' }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
