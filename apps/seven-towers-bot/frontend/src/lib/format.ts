export type DateGroup = "Today" | "Yesterday" | "Previous 7 days" | "Older";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Bucket an ISO timestamp into a sidebar date group (local time). */
export function groupByDate(iso: string, now = new Date()): DateGroup {
  const then = startOfLocalDay(new Date(iso));
  const today = startOfLocalDay(now);
  const diffDays = Math.round(
    (today.getTime() - then.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Previous 7 days";
  return "Older";
}

export function relativeTime(iso: string, now = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

/** True when the composer should block send. */
export function isOverMessageLimit(
  length: number,
  max = Number.POSITIVE_INFINITY,
): boolean {
  return length > max;
}

/** Show the counter once the user reaches 80% of the limit. */
export function shouldShowCharCounter(
  length: number,
  max: number,
): boolean {
  return length >= max * 0.8;
}
