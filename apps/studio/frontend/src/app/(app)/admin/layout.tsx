'use client';

import type { ReactNode } from 'react';
import { AdminShell } from '@/features/admin/admin-shell';
import { RequireAdmin } from '@/features/auth/require-admin';

/** Stable shell so the admin SSE + live strip survive tab navigation. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
