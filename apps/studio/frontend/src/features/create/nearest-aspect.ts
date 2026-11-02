import { parseAspect } from './media-size';

/** Pick the aspect preset closest to the image’s width/height ratio. */
export function nearestAspect(
  width: number,
  height: number,
  presets: readonly string[],
): string {
  if (presets.length === 0) return '1:1';
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return presets[0] ?? '1:1';
  }
  const ratio = width / height;
  let best = presets[0]!;
  let bestDiff = Infinity;
  for (const preset of presets) {
    const { w, h } = parseAspect(preset);
    const diff = Math.abs(ratio - w / h);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = preset;
    }
  }
  return best;
}
