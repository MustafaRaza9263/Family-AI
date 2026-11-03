'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { AdminEventsState } from './use-admin-events';

const AdminEventsContext = createContext<AdminEventsState | null>(null);

export function AdminEventsProvider({
  value,
  children,
}: {
  value: AdminEventsState;
  children: ReactNode;
}) {
  return (
    <AdminEventsContext.Provider value={value}>
      {children}
    </AdminEventsContext.Provider>
  );
}

export function useAdminEventsState(): AdminEventsState {
  const ctx = useContext(AdminEventsContext);
  if (!ctx) {
    throw new Error('useAdminEventsState must be used inside AdminShell');
  }
  return ctx;
}
