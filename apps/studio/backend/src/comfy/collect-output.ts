import path from 'node:path';
import { EngineError, EngineErrorCodes } from './errors.js';
import type { Recipe } from './recipes/recipe.js';
import type { ComfyHistoryEntry, ComfyHttp, ComfyImageRef } from './types.js';

export type CollectedOutput = {
  outputs: Buffer[];
  files: ComfyImageRef[];
  extension: string;
  kind: 'image' | 'video';
};

const OUTPUT_KEYS = ['images', 'videos', 'gifs'] as const;

export function findOutputFiles(
  recipe: Recipe,
  entry: ComfyHistoryEntry,
): ComfyImageRef[] {
  const outNodeId = recipe.titleToNodeId.get(recipe.manifest.output.title);
  if (!outNodeId) return [];
  const nodeOut = entry.outputs?.[outNodeId];
  if (!nodeOut) return [];
  for (const key of OUTPUT_KEYS) {
    const list = nodeOut[key];
    if (list && list.length > 0) return list;
  }
  return [];
}

export function historyLooksDone(entry: ComfyHistoryEntry): boolean {
  if (entry.status?.completed === true) return true;
  if (entry.status?.status_str === 'success') return true;
  return Object.keys(entry.outputs ?? {}).length > 0;
}

function extensionOf(filename: string): string {
  const ext = path.extname(filename).replace(/^\./, '').toLowerCase();
  return ext || 'bin';
}

function kindFromExtension(ext: string): 'image' | 'video' {
  if (ext === 'mp4' || ext === 'webm' || ext === 'mov' || ext === 'mkv') {
    return 'video';
  }
  return 'image';
}

export async function collectOutputFromHistory(
  http: ComfyHttp,
  recipe: Recipe,
  entry: ComfyHistoryEntry,
): Promise<CollectedOutput> {
  const files = findOutputFiles(recipe, entry);
  if (files.length === 0) {
    throw new EngineError(
      EngineErrorCodes.ENGINE_BAD_OUTPUT,
      'Image engine produced no output',
    );
  }
  // First file only; batch_size is locked at 1 in recipes.
  const first = files[0];
  if (!first) {
    throw new EngineError(
      EngineErrorCodes.ENGINE_BAD_OUTPUT,
      'Image engine produced no output',
    );
  }
  const bytes = await http.view(first);
  const extension = extensionOf(first.filename);
  return {
    outputs: [bytes],
    files,
    extension,
    kind: kindFromExtension(extension),
  };
}
