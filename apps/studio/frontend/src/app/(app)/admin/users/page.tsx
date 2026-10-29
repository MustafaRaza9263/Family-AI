'use client';

import { UsersPage } from '@/features/admin/users-page';
import { RequireAdmin } from '@/features/auth/require-admin';

export default function AdminUsersRoute() {
  return (
    <RequireAdmin>
      <UsersPage />
    </RequireAdmin>
  );
}
