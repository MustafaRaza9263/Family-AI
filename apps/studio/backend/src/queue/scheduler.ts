export type SchedulableJob = {
  id: string;
  userId: string;
  tool: 'image' | 'video';
  timings: { queuedAt: Date };
};

/**
 * Images before videos; within a tool band, the user served least recently
 * goes first; within a user, oldest job first. Index 0 is next to run;
 * index+1 is the 1-based queue position for SSE.
 */
export function orderQueue<T extends SchedulableJob>(
  queued: T[],
  lastServedAt: ReadonlyMap<string, number>,
): T[] {
  const images = queued.filter((j) => j.tool === 'image');
  const videos = queued.filter((j) => j.tool === 'video');
  return [...roundRobin(images, lastServedAt), ...roundRobin(videos, lastServedAt)];
}

function roundRobin<T extends SchedulableJob>(
  jobs: T[],
  lastServedAt: ReadonlyMap<string, number>,
): T[] {
  if (jobs.length === 0) return [];

  const byUser = new Map<string, T[]>();
  for (const job of jobs) {
    const list = byUser.get(job.userId) ?? [];
    list.push(job);
    byUser.set(job.userId, list);
  }
  for (const list of byUser.values()) {
    list.sort(
      (a, b) => a.timings.queuedAt.getTime() - b.timings.queuedAt.getTime(),
    );
  }

  const users = [...byUser.keys()].sort((a, b) => {
    const ta = lastServedAt.get(a) ?? 0;
    const tb = lastServedAt.get(b) ?? 0;
    if (ta !== tb) return ta - tb;
    // Stable tie-break: earliest waiting job among that user.
    const ja = byUser.get(a)?.[0]?.timings.queuedAt.getTime() ?? 0;
    const jb = byUser.get(b)?.[0]?.timings.queuedAt.getTime() ?? 0;
    return ja - jb;
  });

  const result: T[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const userId of users) {
      const list = byUser.get(userId);
      const next = list?.shift();
      if (next) {
        result.push(next);
        progress = true;
      }
    }
  }
  return result;
}
