import { describe, expect, it } from 'vitest';
import { decideNotification } from './decisions';

describe('decideNotification', () => {
  it('stays quiet when the tab is visible', () => {
    expect(
      decideNotification({
        documentHidden: false,
        soundEnabled: true,
        notifPermission: 'granted',
        eventType: 'job.done',
      }),
    ).toEqual({
      playSound: false,
      showBrowserNotification: false,
      bumpTitle: false,
    });
  });

  it('notifies when hidden and permitted', () => {
    expect(
      decideNotification({
        documentHidden: true,
        soundEnabled: true,
        notifPermission: 'granted',
        eventType: 'job.done',
      }),
    ).toEqual({
      playSound: true,
      showBrowserNotification: true,
      bumpTitle: true,
    });
  });

  it('respects mute and denied permission', () => {
    expect(
      decideNotification({
        documentHidden: true,
        soundEnabled: false,
        notifPermission: 'denied',
        eventType: 'job.failed',
      }),
    ).toEqual({
      playSound: false,
      showBrowserNotification: false,
      bumpTitle: true,
    });
  });
});
