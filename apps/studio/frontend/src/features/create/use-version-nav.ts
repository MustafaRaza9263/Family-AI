'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  isRegenerating,
  keptVersions,
  liveAttempt,
  type ThreadItem,
} from './version-groups';

const REVERT_MS = 1800;

/**
 * Navigator + active item for a generation card that may hold multiple
 * regenerate versions (template: glass chip + live slot).
 */
export function useVersionNav(versions: ThreadItem[]) {
  const kept = useMemo(() => keptVersions(versions), [versions]);
  const live = useMemo(() => liveAttempt(versions), [versions]);
  const regenerating = isRegenerating(versions);
  const liveId = live?.job.id;
  const liveStatus = live?.job.status;

  const endedBad =
    regenerating &&
    (liveStatus === 'failed' || liveStatus === 'cancelled');

  const [reverted, setReverted] = useState(false);
  const [view, setView] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset flash when attempt changes
    setReverted(false);
    if (!endedBad) return;
    const id = window.setTimeout(() => setReverted(true), REVERT_MS);
    return () => window.clearTimeout(id);
  }, [endedBad, liveId]);

  const showLive = Boolean(live) && !(endedBad && reverted);
  const slots: ThreadItem[] = showLive ? [...kept, live!] : kept;
  const total = Math.max(1, slots.length);

  useEffect(() => {
    if (showLive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the live slot
      setView(kept.length);
      return;
    }
    if (reverted && kept.length > 0) {
      setView(kept.length - 1);
    }
  }, [liveId, showLive, reverted, kept.length]);

  const safeView = Math.min(view, total - 1);
  const viewingLive = showLive && safeView === kept.length;
  const active = slots[safeView] ?? versions[0]!;

  return {
    active,
    view: safeView,
    total,
    viewingLive,
    regenerating: regenerating && showLive,
    showSwitcher: total > 1,
    setView,
    canPrev: safeView > 0,
    canNext: safeView < total - 1,
  };
}
