import {
  Circle,
  Clock,
  Image as ImageIcon,
  Maximize2,
  Ratio,
  RectangleHorizontal,
  Settings2,
  Sparkles,
  Square,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/** Whitelist of lucide icons recipes may name. Unknown names get a fallback. */
const REGISTRY: Record<string, LucideIcon> = {
  zap: Zap,
  sparkles: Sparkles,
  clock: Clock,
  image: ImageIcon,
  video: Video,
  settings: Settings2,
  square: Square,
  landscape: RectangleHorizontal,
  maximize: Maximize2,
  ratio: Ratio,
  circle: Circle,
};

export function resolveIcon(name: string | undefined): LucideIcon {
  if (!name) return Circle;
  return REGISTRY[name] ?? Circle;
}

/** Tiny aspect glyph from "W:H" (e.g. 16:9) for the fan-out pill. */
export function AspectGlyph({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [wRaw, hRaw] = value.split(':');
  const w = Number(wRaw);
  const h = Number(hRaw);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return <Square className={cn('size-4', className)} aria-hidden />;
  }
  const max = 12;
  const scale = max / Math.max(w, h);
  const rw = Math.max(4, w * scale);
  const rh = Math.max(4, h * scale);
  const x = (20 - rw) / 2;
  const y = (20 - rh) / 2;
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn('size-4 shrink-0', className)}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x={x} y={y} width={rw} height={rh} rx="2" />
    </svg>
  );
}
