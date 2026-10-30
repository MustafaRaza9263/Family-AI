import type { StudioEvent } from '@studio/shared';
import type { Clock } from '../lib/clock.js';

export type EventListener = (event: StudioEvent | { type: 'heartbeat' }) => void;

export type HubConnection = {
  id: string;
  listener: EventListener;
  createdAt: number;
};

const MAX_CONNECTIONS_PER_USER = 5;
const HEARTBEAT_MS = 25_000;

export type EventHub = {
  subscribe(userId: string, listener: EventListener): () => void;
  publish(userId: string, event: StudioEvent): void;
  publishAll(event: StudioEvent): void;
  /** Close heartbeat timer (tests / shutdown). */
  close(): void;
  connectionCount(userId: string): number;
};

export function createEventHub(clock: Clock = { now: () => new Date() }): EventHub {
  const byUser = new Map<string, Set<HubConnection>>();
  let nextId = 1;

  const heartbeat = setInterval(() => {
    for (const conns of byUser.values()) {
      for (const conn of conns) {
        try {
          conn.listener({ type: 'heartbeat' });
        } catch {
          // Never let a bad subscriber stop the hub.
        }
      }
    }
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  return {
    subscribe(userId, listener) {
      let set = byUser.get(userId);
      if (!set) {
        set = new Set();
        byUser.set(userId, set);
      }
      // Cap fan-out so one user cannot pin unbounded SSE sockets.
      while (set.size >= MAX_CONNECTIONS_PER_USER) {
        let oldest: HubConnection | null = null;
        for (const c of set) {
          if (!oldest || c.createdAt < oldest.createdAt) oldest = c;
        }
        if (oldest) set.delete(oldest);
      }
      const conn: HubConnection = {
        id: String(nextId++),
        listener,
        createdAt: clock.now().getTime(),
      };
      set.add(conn);
      return () => {
        set.delete(conn);
        if (set.size === 0) byUser.delete(userId);
      };
    },

    publish(userId, event) {
      const set = byUser.get(userId);
      if (!set) return;
      for (const conn of set) {
        try {
          conn.listener(event);
        } catch {
          // ignore
        }
      }
    },

    publishAll(event) {
      for (const userId of byUser.keys()) {
        this.publish(userId, event);
      }
    },

    close() {
      clearInterval(heartbeat);
      byUser.clear();
    },

    connectionCount(userId) {
      return byUser.get(userId)?.size ?? 0;
    },
  };
}
