import { pickMode } from '@studio/shared';
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

type RecipeMode = {
  recipeId: string;
  tool: 'image' | 'video';
  inputImages: { min: number; max: number };
  variant?: { id: string; default?: boolean };
};

/** Resolve recipe from loaded manifests via shared pickMode (authoritative). */
export function pickRecipe(
  input: PickRecipeInput,
  recipes: ReadonlyMap<string, Recipe>,
): PickedRecipe {
  const modes: RecipeMode[] = [];
  for (const recipe of recipes.values()) {
    if (recipe.manifest.tool !== input.tool) continue;
    const { match } = recipe.manifest;
    modes.push({
      recipeId: recipe.id,
      tool: recipe.manifest.tool,
      inputImages: match.inputImages,
      variant: match.variant
        ? { id: match.variant.id, default: match.variant.default }
        : undefined,
    });
  }

  const picked = pickMode(modes, {
    inputImageCount: input.inputAssetIds.length,
    variantId: input.variant,
  });

  if (!picked || !recipes.has(picked.recipeId)) {
    throw new AppError(
      400,
      ErrorCodes.UNSUPPORTED_COMBINATION,
      'This attachment combination is not supported',
    );
  }

  return { recipeId: picked.recipeId, tool: picked.tool };
}
