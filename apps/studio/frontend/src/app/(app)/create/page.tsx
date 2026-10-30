'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatePage } from '@/features/create';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CreatePage />
    </Suspense>
  );
}
