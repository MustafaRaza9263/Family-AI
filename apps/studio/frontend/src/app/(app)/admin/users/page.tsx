'use client';

import { AdminShell } from '@/features/admin/admin-shell';
import { RequireAdmin } from '@/features/auth/require-admin';

export default function AdminUsersRoute() {
  return (
    <RequireAdmin>
      <AdminShell />
    </RequireAdmin>
  );
}
