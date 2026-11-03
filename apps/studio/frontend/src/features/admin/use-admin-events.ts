'use client';

import { adminEventSchema, type AdminEvent } from '@studio/shared';
import { useEffect, useReducer, useRef } from 'react';

// ---- types ---------------------------------------------------------------

type AdminLivePayload = Extract<AdminEvent, { type: 'admin.live' }>;

const RING_SIZE = 60;
const BACKOFF_MS = [1000, 2000, 5000, 10_000, 30_000];

// Named event types the backend sends on the admin SSE stream.
const ADMIN_EVENT_TYPES: AdminEvent['type'][] = [
  'job.queued',
  'job.position',
  'job.started',
  'job.progress',
  'job.done',
  'job.failed',
  'job.cancelled',
  'engine',
  'admin.live',
];

export type RingBuffer = {
  gpuUtil: (number | null)[];
  memUsedMb: (number | null)[];
};

export type AdminEventsState = {
  connected: boolean;
  live: AdminLivePayload | null;
  ring: RingBuffer;
  /** Increments on every job.* event — watch this to debounce job list refetches. */
  jobEventCount: number;
};

type Action =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'live'; payload: AdminLivePayload }
  | { type: 'job_event' };

// ---- pure reducer (exported for tests) -----------------------------------

export function adminEventsReducer(
  state: AdminEventsState,
  action: Action,
): AdminEventsState {
  switch (action.type) {
    case 'connected':
      return { ...state, connected: true };
    case 'disconnected':
      // Keep last `live` + ring so a tab remount/reconnect does not flash
      // "Live data paused" or wipe the sparklines.
      return { ...state, connected: false };
    case 'job_event':
      return { ...state, jobEventCount: state.jobEventCount + 1 };
    case 'live': {
      const hw = action.payload.hardware;
      // Keep null slots for missing hardware so sparkline gaps render correctly.
      const gpu = hw?.gpuUtilPct ?? null;
      const mem = hw?.memUsedMb ?? null;
      return {
        ...state,
        live: action.payload,
        ring: {
          gpuUtil: [...state.ring.gpuUtil.slice(-(RING_SIZE - 1)), gpu],
          memUsedMb: [...state.ring.memUsedMb.slice(-(RING_SIZE - 1)), mem],
        },
      };
    }
  }
}

const INITIAL: AdminEventsState = {
  connected: false,
  live: null,
  ring: { gpuUtil: [], memUsedMb: [] },
  jobEventCount: 0,
};

// ---- hook ----------------------------------------------------------------

export function useAdminEvents(enabled: boolean): AdminEventsState {
  const [state, dispatch] = useReducer(adminEventsReducer, INITIAL);
  const attempt = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let closed = false;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onEvent = (msg: MessageEvent<string>) => {
      let raw: unknown;
      try {
        raw = JSON.parse(msg.data);
      } catch {
        return;
      }
      const parsed = adminEventSchema.safeParse(raw);
      if (!parsed.success) return;

      if (parsed.data.type === 'admin.live') {
        dispatch({ type: 'live', payload: parsed.data });
      } else if (parsed.data.type.startsWith('job.')) {
        dispatch({ type: 'job_event' });
      }
    };

    const connect = () => {
      if (closed) return;
      source = new EventSource('/api/admin/events', { withCredentials: true });

      source.onopen = () => {
        attempt.current = 0;
        dispatch({ type: 'connected' });
      };

      for (const type of ADMIN_EVENT_TYPES) {
        source.addEventListener(type, onEvent as EventListener);
      }

      source.onerror = () => {
        source?.close();
        source = null;
        dispatch({ type: 'disconnected' });
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
      clearTimeout(timer);
      source?.close();
    };
  }, [enabled]);

  return state;
}
