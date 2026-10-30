/** Display height for generation previews (matches Tailwind max-h-96). */
export const MEDIA_MAX_H = 384;

export function parseAspect(value: string | undefined): { w: number; h: number } {
  const [a, b] = (value ?? '1:1').split(':').map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    return { w: 1, h: 1 };
  }
  return { w: a, h: b };
}

/** CSS pixel width when height is capped at MEDIA_MAX_H. */
export function mediaWidthFromAspect(aspectRatio: string | undefined): number {
  const { w, h } = parseAspect(aspectRatio);
  return Math.max(1, Math.round(MEDIA_MAX_H * (w / h)));
}
