import type { RecipeManifest } from './manifest-schema.js';

/**
 * Turn legacy option.sizes into writes so patchGraph has one path.
 * Uses the param's target title (IN_SIZE) for width/height fields.
 */
export function normalizeManifestSizes(
  manifest: RecipeManifest,
): RecipeManifest {
  const params: RecipeManifest['params'] = {};
  for (const [name, param] of Object.entries(manifest.params)) {
    if (param.type !== 'enum' || !param.target) {
      params[name] = param;
      continue;
    }
    const title = param.target.title;
    params[name] = {
      ...param,
      options: param.options.map((opt) => {
        if (!opt.sizes) return opt;
        const { sizes, ...rest } = opt;
        return {
          ...rest,
          writes: [
            ...(opt.writes ?? []),
            { title, field: 'width', value: sizes.width },
            { title, field: 'height', value: sizes.height },
          ],
        };
      }),
    };
  }
  return { ...manifest, params };
}
