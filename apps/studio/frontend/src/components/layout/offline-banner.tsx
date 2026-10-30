'use client';

import { useOnline } from '@/hooks/use-online';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="bg-warning px-4 py-2 text-center text-sm font-medium text-white"
    >
      You are offline. Changes will sync when you reconnect.
    </div>
  );
}
