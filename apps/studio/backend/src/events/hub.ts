import type { AdminEvent, StudioEvent } from '@studio/shared';
import type { Clock } from '../lib/clock.js';

export type EventListener = (event: StudioEvent | { type: 'heartbeat' }) => void;
export type AdminEventListener = (
  event: AdminEvent | { type: 'heartbeat' },
) => void;

export type HubConnection = {
  id: string;
  listener: EventListener;
  createdAt: number;
};

export type AdminHubConnection = {
  id: string;
  userId: string;
  listener: AdminEventListener;
  createdAt: number;
};

const MAX_CONNECTIONS_PER_USER = 5;
const MAX_ADMIN_CONNECTIONS_PER_USER = 3;
const HEARTBEAT_MS = 25_000;

export type EventHub = {
  subscribe(userId: string, listener: EventListener): () => void;
  subscribeAdmin(userId: string, listener: AdminEventListener): () => void;
  publish(userId: string, event: StudioEvent): void;
  publishAll(event: StudioEvent): void;
  publishAdmin(event: AdminEvent): void;
  adminConnectionCount(): number;
  onAdminCountChange(handler: (count: number) => void): () => void;
  /** Close heartbeat timer (tests / shutdown). */
  close(): void;
  connectionCount(userId: string): number;
};

export function createEventHub(clock: Clock = { now: () => new Date() }): EventHub {
  const byUser = new Map<string, Set<HubConnection>>();
  const admins = new Set<AdminHubConnection>();
  const adminCountHandlers = new Set<(count: number) => void>();
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
    for (const conn of admins) {
      try {
        conn.listener({ type: 'heartbeat' });
      } catch {
        // ignore
      }
    }
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  const notifyAdminCount = (): void => {
    const count = admins.size;
    for (const handler of adminCountHandlers) {
      try {
        handler(count);
      } catch {
        // ignore
      }
    }
  };

  const fanAdmin = (event: AdminEvent): void => {
    for (const conn of admins) {
      try {
        conn.listener(event);
      } catch {
        // ignore
      }
    }
  };

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

    subscribeAdmin(userId, listener) {
      const mine = [...admins].filter((c) => c.userId === userId);
      while (mine.length >= MAX_ADMIN_CONNECTIONS_PER_USER) {
        const oldest = mine.shift();
        if (oldest) {
          admins.delete(oldest);
        }
      }
      const conn: AdminHubConnection = {
        id: String(nextId++),
        userId,
        listener,
        createdAt: clock.now().getTime(),
      };
      admins.add(conn);
      notifyAdminCount();
      return () => {
        admins.delete(conn);
        notifyAdminCount();
      };
    },

    publish(userId, event) {
      const set = byUser.get(userId);
      if (set) {
        for (const conn of set) {
          try {
            conn.listener(event);
          } catch {
            // ignore
          }
        }
      }
      fanAdmin({ ...event, userId } as AdminEvent);
    },

    publishAll(event) {
      for (const set of byUser.values()) {
        for (const conn of set) {
          try {
            conn.listener(event);
          } catch {
            // ignore
          }
        }
      }
      // One admin fan-out for broadcasts (engine), not once per user.
      fanAdmin({ ...event } as AdminEvent);
    },

    publishAdmin(event) {
      fanAdmin(event);
    },

    adminConnectionCount() {
      return admins.size;
    },

    onAdminCountChange(handler) {
      adminCountHandlers.add(handler);
      return () => {
        adminCountHandlers.delete(handler);
      };
    },

    close() {
      clearInterval(heartbeat);
      byUser.clear();
      admins.clear();
      adminCountHandlers.clear();
    },

    connectionCount(userId) {
      return byUser.get(userId)?.size ?? 0;
    },
  };
}
