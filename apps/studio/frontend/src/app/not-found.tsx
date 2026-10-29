import Link from 'next/link';
import { BrandMark } from '@/components/layout/brand-mark';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <BrandMark />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        Go home
      </Link>
    </div>
  );
}
