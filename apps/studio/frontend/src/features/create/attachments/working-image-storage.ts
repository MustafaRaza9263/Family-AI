import { readJsonStorage, writeJsonStorage } from '@/lib/storage';

type DismissMap = Record<string, boolean>;

const KEY = 'studio.workingImage.dismissed';

export function isWorkingDismissed(threadId: string): boolean {
  try {
    const map = readJsonStorage<DismissMap>(KEY) ?? {};
    return map[threadId] === true;
  } catch {
    return false;
  }
}

export function setWorkingDismissed(
  threadId: string,
  dismissed: boolean,
): void {
  try {
    const map = readJsonStorage<DismissMap>(KEY) ?? {};
    if (dismissed) map[threadId] = true;
    else delete map[threadId];
    writeJsonStorage(KEY, map);
  } catch {
    // session/local storage may be blocked — ignore.
  }
}
