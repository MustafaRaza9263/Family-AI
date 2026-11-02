/** Short badge like 0:05 or 1:02 from durationSec. */
export function formatDurationBadge(durationSec: number | undefined): string | null {
  if (durationSec === undefined || !Number.isFinite(durationSec) || durationSec < 0) {
    return null;
  }
  const total = Math.round(durationSec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
