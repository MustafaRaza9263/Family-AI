'use client';

import type { JobStage, UserJob } from '@studio/shared';
import { useEffect, useState } from 'react';

export type CardState =
  | 'queued'
  | 'preparing'
  | 'generating'
  | 'finishing'
  | 'done'
  | 'failed'
  | 'cancelled';

export function cardState(job: UserJob, stage?: JobStage): CardState {
  if (job.status === 'queued') return 'queued';
  if (job.status === 'failed') return 'failed';
  if (job.status === 'cancelled') return 'cancelled';
  if (job.status === 'done') return 'done';
  if (stage === 'generating') return 'generating';
  if (stage === 'finishing') return 'finishing';
  return 'preparing';
}

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatTook(
  startedAt?: string,
  finishedAt?: string,
): string | null {
  if (!startedAt || !finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function useLiveTimer(
  startedAt: string | undefined,
  running: boolean,
): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || !startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running, startedAt]);
  if (!running || !startedAt) return null;
  const ms = now - new Date(startedAt).getTime();
  if (!Number.isFinite(ms)) return null;
  return formatElapsed(ms);
}

export function statusPlain(
  state: CardState,
  position: number | undefined,
  pct: number,
): string {
  switch (state) {
    case 'queued': {
      const ahead = position && position > 1 ? position - 1 : 0;
      return ahead > 0 ? `Queued · ${ahead} ahead` : 'Next up';
    }
    case 'preparing':
      return 'Warming up';
    case 'generating':
      return `Generating · ${pct}%`;
    case 'finishing':
      return 'Finishing';
    case 'failed':
      return 'Couldn’t generate · not counted';
    case 'cancelled':
      return 'Cancelled';
    default:
      return '';
  }
}

export function StatusLabel({
  state,
  position,
  pct,
}: {
  state: CardState;
  position: number | undefined;
  pct: number;
}) {
  const bold = (text: string) => (
    <span className="font-medium text-foreground">{text}</span>
  );
  switch (state) {
    case 'queued': {
      const ahead = position && position > 1 ? position - 1 : 0;
      return ahead > 0 ? (
        <>
          {bold('Queued')} · {ahead} ahead
        </>
      ) : (
        bold('Next up')
      );
    }
    case 'preparing':
      return bold('Warming up');
    case 'generating':
      return (
        <>
          {bold('Generating')} · {pct}%
        </>
      );
    case 'finishing':
      return bold('Finishing');
    case 'failed':
      return (
        <>
          {bold('Couldn’t generate')} · not counted
        </>
      );
    case 'cancelled':
      return bold('Cancelled');
    default:
      return null;
  }
}
