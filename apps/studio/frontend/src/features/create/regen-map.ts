import { readJsonStorage, writeJsonStorage } from '@/lib/storage';
import type { RegenMap } from './version-groups';

function storageKey(threadId: string): string {
  return `studio:regen-map:${threadId}`;
}

export function loadRegenMap(threadId: string): RegenMap {
  return readJsonStorage<RegenMap>(storageKey(threadId)) ?? {};
}

export function saveRegenMap(threadId: string, map: RegenMap): void {
  writeJsonStorage(storageKey(threadId), map);
}

/** Link a new job as an in-place regenerate of root (or of a prior child). */
export function linkRegen(
  map: RegenMap,
  childJobId: string,
  fromJobId: string,
): RegenMap {
  const rootId = map[fromJobId] ?? fromJobId;
  if (childJobId === rootId) return map;
  return { ...map, [childJobId]: rootId };
}
