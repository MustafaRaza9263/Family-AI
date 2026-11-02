'use client';

import { useCallback, useState } from 'react';
import { linkRegen, loadRegenMap, saveRegenMap } from './regen-map';
import type { RegenMap } from './version-groups';

/** Per-thread regenerate child→root map, persisted in localStorage. */
export function useRegenMap(threadId: string | undefined): {
  map: RegenMap;
  link: (childJobId: string, fromJobId: string) => void;
} {
  const [maps, setMaps] = useState<Record<string, RegenMap>>({});
  const map = threadId ? (maps[threadId] ?? loadRegenMap(threadId)) : {};

  const link = useCallback(
    (childJobId: string, fromJobId: string) => {
      if (!threadId) return;
      setMaps((prev) => {
        const base = prev[threadId] ?? loadRegenMap(threadId);
        const next = linkRegen(base, childJobId, fromJobId);
        saveRegenMap(threadId, next);
        return { ...prev, [threadId]: next };
      });
    },
    [threadId],
  );

  return { map, link };
}
