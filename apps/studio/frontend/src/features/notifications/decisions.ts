export type NotificationDecisionInput = {
  documentHidden: boolean;
  soundEnabled: boolean;
  notifPermission: NotificationPermission | 'unsupported';
  eventType: 'job.done' | 'job.failed' | string;
};

export type NotificationDecision = {
  playSound: boolean;
  showBrowserNotification: boolean;
  bumpTitle: boolean;
};

/** Pure rules for background job completion feedback. */
export function decideNotification(
  input: NotificationDecisionInput,
): NotificationDecision {
  const terminal = input.eventType === 'job.done' || input.eventType === 'job.failed';
  if (!terminal || !input.documentHidden) {
    return {
      playSound: false,
      showBrowserNotification: false,
      bumpTitle: false,
    };
  }

  return {
    playSound: input.soundEnabled,
    showBrowserNotification: input.notifPermission === 'granted',
    bumpTitle: true,
  };
}
