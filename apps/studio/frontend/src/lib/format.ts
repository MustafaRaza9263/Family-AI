export function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part && part.length > 0 ? part : fullName;
}

export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Local calendar day key for grouping thread items (YYYY-M-D). */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'invalid';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Thread day label, e.g. "October 31 2026". */
export function formatThreadDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${month} ${d.getDate()} ${d.getFullYear()}`;
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

/** e.g. 500 → "500ms", 4200 → "4.2s", 124000 → "2m 4s" */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

/** Megabytes → "3.2 GB" */
export function formatMbAsGb(mb: number): string {
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** e.g. 145 → "145 W" */
export function formatWatts(w: number): string {
  return `${Math.round(w)} W`;
}

/** e.g. 67.4 → "67%" (integer rounding by default) */
export function formatPercent(p: number, decimals = 0): string {
  return `${p.toFixed(decimals)}%`;
}

/** Bytes → human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
