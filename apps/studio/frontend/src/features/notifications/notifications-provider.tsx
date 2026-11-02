'use client';

import { PRODUCT_NAME, studioEventSchema } from '@studio/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  jobTool,
  readyNotificationBody,
} from '@/features/events/apply-event';
import { readStorage, writeStorage } from '@/lib/storage';
import { decideNotification } from './decisions';
import { playSoftBeep } from './sound';
import { bumpReadyTitle, clearReadyTitle } from './title';

const SOUND_KEY = 'studio.soundEnabled';
const SOUND_EVENT = 'studio-sound-change';

function subscribeSound(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  window.addEventListener(SOUND_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(SOUND_EVENT, handler);
  };
}

function soundSnapshot(): boolean {
  return readStorage(SOUND_KEY) !== '0';
}

type Ctx = {
  soundEnabled: boolean;
  setMuted: (muted: boolean) => void;
  permission: NotificationPermission | 'unsupported';
  enableNotifications: () => Promise<void>;
  handleRawEvent: (raw: unknown) => void;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const soundEnabled = useSyncExternalStore(
    subscribeSound,
    soundSnapshot,
    () => true,
  );
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >('unsupported');

  useEffect(() => {
    // Client-only API; seed after mount to avoid SSR/client permission mismatch.
    if (typeof Notification !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Notification is window-only
      setPermission(Notification.permission);
    }
    const onFocus = () => clearReadyTitle();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    writeStorage(SOUND_KEY, muted ? '0' : '1');
    window.dispatchEvent(new Event(SOUND_EVENT));
  }, []);

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    setPermission(await Notification.requestPermission());
  }, []);

  const handleRawEvent = useCallback(
    (raw: unknown) => {
      const parsed = studioEventSchema.safeParse(raw);
      if (!parsed.success) return;
      const eventType = parsed.data.type;
      const decision = decideNotification({
        documentHidden: document.hidden,
        soundEnabled,
        notifPermission: permission,
        eventType,
      });
      if (decision.playSound) playSoftBeep();
      if (decision.bumpTitle) bumpReadyTitle();
      if (decision.showBrowserNotification) {
        try {
          const tool =
            parsed.data.type === 'job.done'
              ? jobTool(client, parsed.data.jobId)
              : undefined;
          new Notification(PRODUCT_NAME, {
            body:
              eventType === 'job.failed'
                ? 'A generation failed'
                : readyNotificationBody(tool),
          });
        } catch {
          // Ignore blocked notifications.
        }
      }
    },
    [client, permission, soundEnabled],
  );

  const value = useMemo(
    () => ({
      soundEnabled,
      setMuted,
      permission,
      enableNotifications,
      handleRawEvent,
    }),
    [soundEnabled, setMuted, permission, enableNotifications, handleRawEvent],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications requires NotificationsProvider');
  }
  return ctx;
}
