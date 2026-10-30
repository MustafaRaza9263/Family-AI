'use client';

import { Bell, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '../notifications-provider';

export function NotificationControls() {
  const { soundEnabled, setMuted, permission, enableNotifications } =
    useNotifications();

  return (
    <div className="space-y-3">
      {permission !== 'granted' && permission !== 'unsupported' ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-start"
          onClick={() => void enableNotifications()}
        >
          <Bell className="size-4" />
          Enable notifications
        </Button>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-start"
        onClick={() => setMuted(soundEnabled)}
      >
        {soundEnabled ? (
          <Volume2 className="size-4" />
        ) : (
          <VolumeX className="size-4" />
        )}
        {soundEnabled ? 'Sound on' : 'Sound muted'}
      </Button>
    </div>
  );
}
