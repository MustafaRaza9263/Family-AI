/**
 * Simple SVG polyline sparkline — no chart library.
 * Null values create gaps in the line.
 */
import { cn } from '@/lib/cn';

type Props = {
  data: (number | null)[];
  /** Clamp maximum to this (defaults to actual max in data). */
  max?: number;
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({
  data,
  max: maxProp,
  width = 80,
  height = 28,
  className,
}: Props) {
  if (data.length < 2) return null;

  const nonNull = data.filter((v): v is number => v !== null);
  if (nonNull.length < 2) return null;

  const maxVal = maxProp ?? Math.max(...nonNull);
  if (maxVal <= 0) return null;

  const n = data.length;
  const stepX = width / Math.max(1, n - 1);

  // Build path segments; null values break the line into separate <path>s.
  const segments: string[] = [];
  let current = '';

  for (let i = 0; i < n; i++) {
    const v = data[i];
    if (v === null) {
      if (current) {
        segments.push(current);
        current = '';
      }
      continue;
    }
    const x = (i * stepX).toFixed(1);
    // Flip y: 0 = bottom, maxVal = top.
    const y = (height - (v / maxVal) * height).toFixed(1);
    current += current ? ` L${x},${y}` : `M${x},${y}`;
  }
  if (current) segments.push(current);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      {segments.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
