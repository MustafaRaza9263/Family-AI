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

/** Tiny aspect glyph from "W:H" (e.g. 16:9). */
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
    return <Square className={className} aria-hidden />;
  }
  const max = 14;
  const scale = max / Math.max(w, h);
  return (
    <span
      className={className}
      aria-hidden
      style={{
        display: 'inline-block',
        width: Math.max(6, w * scale),
        height: Math.max(6, h * scale),
        border: '1.5px solid currentColor',
        borderRadius: 2,
      }}
    />
  );
}
