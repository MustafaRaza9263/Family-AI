import { describe, expect, it } from 'vitest';
import type { Recipe } from '../../src/comfy/recipes/recipe.js';
import { ErrorCodes } from '../../src/lib/errors.js';
import { pickRecipe } from '../../src/services/pick-recipe.js';

function recipe(id: string, tool: 'image' | 'video' = 'image'): Recipe {
  return {
    id,
    manifest: {
      id,
      tool,
      timeoutSeconds: 60,
      params: {},
      seed: { target: { title: 'IN_SAMPLER', fields: ['seed'] } },
      output: { title: 'OUT_IMAGE', prefixField: 'filename_prefix' },
    },
    graph: {},
    titleToNodeId: new Map(),
  };
}

describe('pickRecipe', () => {
  it('picks image-create-fast for text-to-image', () => {
    const recipes = new Map([['image-create-fast', recipe('image-create-fast')]]);
    expect(
      pickRecipe({ tool: 'image', inputAssetIds: [] }, recipes).recipeId,
    ).toBe('image-create-fast');
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
