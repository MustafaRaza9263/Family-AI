'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAdmin } from '@/features/auth/require-admin';

export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/users/');
  }, [router]);
  return (
    <RequireAdmin>
      <p className="text-sm text-muted-foreground">Opening admin…</p>
    </RequireAdmin>
  );
}
