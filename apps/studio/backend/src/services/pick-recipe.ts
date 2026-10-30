import { AppError, ErrorCodes } from '../lib/errors.js';
import type { Recipe } from '../comfy/recipes/recipe.js';

export type PickRecipeInput = {
  tool: 'image' | 'video';
  variant?: string;
  inputAssetIds: string[];
};

export type PickedRecipe = {
  recipeId: string;
  tool: 'image' | 'video';
};

/**
 * Local resolver until pickMode lands in @studio/shared (part 2).
 * Capabilities follow which recipes are loaded on disk.
 */
export function pickRecipe(
  input: PickRecipeInput,
  recipes: ReadonlyMap<string, Recipe>,
): PickedRecipe {
  const n = input.inputAssetIds.length;
  let recipeId: string | null = null;

  if (input.tool === 'image') {
    if (n === 0) {
      const quality = input.variant === 'best' ? 'best' : 'fast';
      recipeId =
        quality === 'best' ? 'image-create-quality' : 'image-create-fast';
    } else if (n === 1) {
      recipeId = 'image-edit';
    } else if (n >= 2 && n <= 4) {
      recipeId = 'image-reference';
    }
  } else if (input.tool === 'video') {
    if (n === 0) recipeId = 'video-from-text';
    else if (n === 1) recipeId = 'video-from-image';
    else if (n === 2) recipeId = 'video-between-frames';
  }

  if (!recipeId || !recipes.has(recipeId)) {
    throw new AppError(
      400,
      ErrorCodes.UNSUPPORTED_COMBINATION,
      'This attachment combination is not supported',
    );
  }

  const recipe = recipes.get(recipeId);
  if (!recipe) {
    throw new AppError(
      400,
      ErrorCodes.UNSUPPORTED_COMBINATION,
      'This attachment combination is not supported',
    );
  }

  return { recipeId, tool: recipe.manifest.tool };
}
