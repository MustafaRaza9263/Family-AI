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
        'inline-flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
