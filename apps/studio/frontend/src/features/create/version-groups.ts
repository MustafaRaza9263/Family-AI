import type { ThreadDetailResponse } from '@studio/shared';

export type ThreadItem = ThreadDetailResponse['items'][number];

/** childJobId → rootJobId for in-place regenerations. */
export type RegenMap = Record<string, string>;

export type VersionGroup = {
  rootId: string;
  /** Root first, then each regenerate attempt in thread order. */
  versions: ThreadItem[];
};

function resolveRoot(jobId: string, map: RegenMap): string {
  let id = jobId;
  const seen = new Set<string>();
  while (map[id] && !seen.has(id)) {
    seen.add(id);
    id = map[id]!;
  }
  return id;
}

/** Fold regenerate children under their root; preserve root order in the thread. */
export function groupThreadItems(
  items: ThreadItem[],
  map: RegenMap,
): VersionGroup[] {
  const childIds = new Set(Object.keys(map));
  const versionsByRoot = new Map<string, ThreadItem[]>();
  const groups: VersionGroup[] = [];

  for (const item of items) {
    if (childIds.has(item.job.id)) continue;
    const versions = [item];
    versionsByRoot.set(item.job.id, versions);
    groups.push({ rootId: item.job.id, versions });
  }

  for (const item of items) {
    if (!childIds.has(item.job.id)) continue;
    const rootId = resolveRoot(item.job.id, map);
    const list = versionsByRoot.get(rootId);
    if (list) {
      list.push(item);
      continue;
    }
    // Orphan mapping — show as its own card.
    const versions = [item];
    versionsByRoot.set(item.job.id, versions);
    groups.push({ rootId: item.job.id, versions });
  }

  return groups;
}

/** Done outputs kept in the navigator; failed/cancelled regenerations are omitted. */
export function keptVersions(versions: ThreadItem[]): ThreadItem[] {
  return versions.filter((v) => v.job.status === 'done');
}

/**
 * Current attempt when the latest version is not done.
 * Used for the live matrix slot and brief fail/cancel flash.
 */
export function liveAttempt(versions: ThreadItem[]): ThreadItem | null {
  const last = versions[versions.length - 1];
  if (!last || last.job.status === 'done') return null;
  return last;
}

/** Queued/running only — failed/cancelled must still allow Try again. */
export function activeAttempt(versions: ThreadItem[]): ThreadItem | null {
  const live = liveAttempt(versions);
  if (!live) return null;
  if (live.job.status === 'queued' || live.job.status === 'running') return live;
  return null;
}

export function isRegenerating(versions: ThreadItem[]): boolean {
  return keptVersions(versions).length > 0 && liveAttempt(versions) !== null;
}
