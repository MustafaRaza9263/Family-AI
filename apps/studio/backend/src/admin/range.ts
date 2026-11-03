export type StatsRange = '24h' | '7d' | '30d';

const MS: Record<StatsRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function rangeWindow(
  range: StatsRange,
  now: Date,
): { from: Date; to: Date } {
  const to = now;
  return { from: new Date(to.getTime() - MS[range]), to };
}
