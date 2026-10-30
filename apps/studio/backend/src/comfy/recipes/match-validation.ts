import type { RecipeManifest } from './manifest-schema.js';

type Range = { min: number; max: number };

function rangesOverlap(a: Range, b: Range): boolean {
  return a.min <= b.max && b.min <= a.max;
}

function variantKey(manifest: RecipeManifest): string {
  return manifest.match.variant?.id ?? '';
}

/**
 * Boot rules: no two recipes share (tool, overlapping image count, variant);
 * when several variants cover the same count, exactly one has default: true.
 */
export function assertRecipeMatchRules(
  manifests: readonly RecipeManifest[],
): void {
  for (let i = 0; i < manifests.length; i++) {
    for (let j = i + 1; j < manifests.length; j++) {
      const a = manifests[i];
      const b = manifests[j];
      if (!a || !b) continue;
      if (a.match.tool !== b.match.tool) continue;
      if (variantKey(a) !== variantKey(b)) continue;
      if (!rangesOverlap(a.match.inputImages, b.match.inputImages)) continue;
      throw new Error(
        `Recipes "${a.id}" and "${b.id}" both match tool=${a.match.tool} ` +
          `images=[${a.match.inputImages.min},${a.match.inputImages.max}] ` +
          `variant="${variantKey(a) || '(none)'}"`,
      );
    }
  }

  assertDefaultVariants(manifests);
}

function assertDefaultVariants(manifests: readonly RecipeManifest[]): void {
  const byTool = new Map<string, RecipeManifest[]>();
  for (const m of manifests) {
    const list = byTool.get(m.match.tool) ?? [];
    list.push(m);
    byTool.set(m.match.tool, list);
  }

  for (const [tool, list] of byTool) {
    const maxCount = Math.max(
      0,
      ...list.map((m) => m.match.inputImages.max),
    );
    for (let count = 0; count <= maxCount; count++) {
      const covering = list.filter(
        (m) =>
          count >= m.match.inputImages.min &&
          count <= m.match.inputImages.max &&
          m.match.variant !== undefined,
      );
      if (covering.length <= 1) continue;
      const defaults = covering.filter((m) => m.match.variant?.default === true);
      if (defaults.length !== 1) {
        throw new Error(
          `Tool "${tool}" imageCount=${count}: exactly one variant must have ` +
            `default: true (found ${defaults.length} among ${covering.map((m) => m.id).join(', ')})`,
        );
      }
    }
  }
}
