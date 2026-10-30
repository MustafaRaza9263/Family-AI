'use client';

import { useQueryClient } from '@tanstack/react-query';
import { studioEventSchema, type StudioEvent } from '@studio/shared';
import { useEffect, useRef } from 'react';
import { useNotifications } from '@/features/notifications';
import { queryKeys } from '@/lib/query-keys';
import { applyStudioEvent } from './apply-event';

/** Must match `event:` names from the backend writeEvent helper. */
const EVENT_TYPES: StudioEvent['type'][] = [
  'job.queued',
  'job.position',
  'job.started',
  'job.progress',
  'job.done',
  'job.failed',
  'job.cancelled',
  'engine',
];

const BACKOFF_MS = [1000, 2000, 5000, 10_000, 30_000];

export function useStudioEvents(enabled: boolean): void {
  const client = useQueryClient();
  const { handleRawEvent } = useNotifications();
  const handleRef = useRef(handleRawEvent);
  const attempt = useRef(0);

  useEffect(() => {
    handleRef.current = handleRawEvent;
  }, [handleRawEvent]);

  useEffect(() => {
    if (!enabled) return;

    let closed = false;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const invalidateLive = () => {
      void client.invalidateQueries({ queryKey: ['threads'] });
      void client.invalidateQueries({ queryKey: ['library'] });
      void client.invalidateQueries({ queryKey: queryKeys.capabilities });
    };

    const onEvent = (msg: MessageEvent<string>) => {
      let raw: unknown;
      try {
        raw = JSON.parse(msg.data);
      } catch {
        return;
      }
      const parsed = studioEventSchema.safeParse(raw);
      if (!parsed.success) return;
      applyStudioEvent(client, parsed.data);
      handleRef.current(raw);
    };

    const connect = () => {
      if (closed) return;
      source = new EventSource('/api/events', { withCredentials: true });

      source.onopen = () => {
        if (attempt.current > 0) invalidateLive();
        attempt.current = 0;
      };

      // Backend sends named SSE events (`event: job.done`), which do NOT
      // fire `onmessage` — only addEventListener per type receives them.
      for (const type of EVENT_TYPES) {
        source.addEventListener(type, onEvent as EventListener);
      }

      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) return;
        const delay =
          BACKOFF_MS[Math.min(attempt.current, BACKOFF_MS.length - 1)]!;
        attempt.current += 1;
        timer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      source?.close();
    };
  }, [client, enabled]);
}
