import { describe, expect, it } from 'vitest';
import type { Recipe } from '../../src/comfy/recipes/recipe.js';
import { ErrorCodes } from '../../src/lib/errors.js';
import { pickRecipe } from '../../src/services/pick-recipe.js';
import { sampleManifest } from '../comfy/helpers/sample-recipe.js';

function recipeFrom(
  id: string,
  match: Recipe['manifest']['match'],
  tool: 'image' | 'video' = 'image',
): Recipe {
  return {
    id,
    manifest: {
      ...sampleManifest({ id, tool, match }),
      id,
      tool,
      match,
    },
    graph: {},
    titleToNodeId: new Map(),
  };
}

describe('pickRecipe', () => {
  it('picks image-create-fast for text-to-image via default variant', () => {
    const recipes = new Map([
      [
        'image-create-fast',
        recipeFrom('image-create-fast', {
          tool: 'image',
          inputImages: { min: 0, max: 0 },
          variant: { id: 'fast', label: 'Fast', default: true },
        }),
      ],
    ]);
    expect(
      pickRecipe({ tool: 'image', inputAssetIds: [] }, recipes).recipeId,
    ).toBe('image-create-fast');
  });

  it('picks by explicit variant id', () => {
    const recipes = new Map([
      [
        'image-create-fast',
        recipeFrom('image-create-fast', {
          tool: 'image',
          inputImages: { min: 0, max: 0 },
          variant: { id: 'fast', label: 'Fast', default: true },
        }),
      ],
      [
        'image-create-quality',
        recipeFrom('image-create-quality', {
          tool: 'image',
          inputImages: { min: 0, max: 0 },
          variant: { id: 'best', label: 'Best' },
        }),
      ],
    ]);
    expect(
      pickRecipe(
        { tool: 'image', variant: 'best', inputAssetIds: [] },
        recipes,
      ).recipeId,
    ).toBe('image-create-quality');
  });

  it('throws UNSUPPORTED_COMBINATION when recipe missing', () => {
    try {
      pickRecipe({ tool: 'image', inputAssetIds: ['a'] }, new Map());
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toMatchObject({ code: ErrorCodes.UNSUPPORTED_COMBINATION });
    }
  });
});
