import { EngineError, EngineErrorCodes } from './errors.js';
import type { Recipe } from './recipes/recipe.js';
import type { ComfyHistoryEntry, ComfyHttp, ComfyImageRef } from './types.js';

export type CollectedOutput = {
  outputs: Buffer[];
  files: ComfyImageRef[];
};

export function findOutputImages(
  recipe: Recipe,
  entry: ComfyHistoryEntry,
): ComfyImageRef[] {
  const outNodeId = recipe.titleToNodeId.get(recipe.manifest.output.title);
  if (!outNodeId) return [];
  return entry.outputs?.[outNodeId]?.images ?? [];
}

export function historyLooksDone(entry: ComfyHistoryEntry): boolean {
  if (entry.status?.completed === true) return true;
  if (entry.status?.status_str === 'success') return true;
  return Object.keys(entry.outputs ?? {}).length > 0;
}

export async function collectOutputFromHistory(
  http: ComfyHttp,
  recipe: Recipe,
  entry: ComfyHistoryEntry,
): Promise<CollectedOutput> {
  const files = findOutputImages(recipe, entry);
  if (files.length === 0) {
    throw new EngineError(
      EngineErrorCodes.ENGINE_BAD_OUTPUT,
      'Image engine produced no output',
    );
  }
  // First image only for now; batch_size is locked at 1 in recipes.
  const first = files[0];
  if (!first) {
    throw new EngineError(
      EngineErrorCodes.ENGINE_BAD_OUTPUT,
      'Image engine produced no output',
    );
  }
  const bytes = await http.view(first);
  return { outputs: [bytes], files };
}
