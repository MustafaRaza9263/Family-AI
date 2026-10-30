import type { Env } from '../config/env.js';
import type { Logger } from '../lib/logger.js';
import { createComfyHttp } from './http.js';
import { loadRecipes } from './recipes/load-recipes.js';
import { patchGraph, type PatchValues } from './recipes/patch-graph.js';
import type { Recipe } from './recipes/recipe.js';
import { runComfyPrompt } from './run-prompt.js';
import { createComfySocket } from './socket.js';
import type { ComfyHttp, RunHooks } from './types.js';

export type CreateComfyOptions = {
  env: Env;
  logger: Logger;
  http?: ComfyHttp;
  onRawText?: (text: string) => void;
};

export type ComfyRunResult = {
  outputs: Buffer[];
  files: { filename: string; subfolder: string; type: string }[];
  resolved: { width?: number; height?: number; [key: string]: string | number | undefined };
};

export type ComfyClient = {
  recipes: ReadonlyMap<string, Recipe>;
  run(
    recipeId: string,
    input: {
      jobId: string;
      values: PatchValues;
      hooks?: RunHooks;
      signal?: AbortSignal;
    },
  ): Promise<ComfyRunResult>;
  ping(): Promise<void>;
  close(): void;
};

export async function createComfy(
  opts: CreateComfyOptions,
): Promise<ComfyClient> {
  const recipes = await loadRecipes(opts.env.RECIPES_DIR);
  const http = opts.http ?? createComfyHttp({
    baseUrl: opts.env.COMFY_URL,
    logger: opts.logger,
  });
  const socket = createComfySocket({
    baseUrl: opts.env.COMFY_URL,
    logger: opts.logger,
    onRawText: opts.onRawText,
  });

  return {
    recipes,
    async ping(): Promise<void> {
      await http.ping();
    },
    async run(recipeId, input): Promise<ComfyRunResult> {
      const recipe = recipes.get(recipeId);
      if (!recipe) {
        throw new Error(`Unknown recipe "${recipeId}"`);
      }
      const { graph, resolved } = patchGraph(recipe, {
        jobId: input.jobId,
        values: input.values,
      });
      const collected = await runComfyPrompt({
        http,
        events: socket,
        clientId: socket.clientId,
        recipe,
        graph,
        hooks: input.hooks,
        signal: input.signal,
        timeoutMs: recipe.manifest.timeoutSeconds * 1000,
        logger: opts.logger,
      });
      return { ...collected, resolved };
    },
    close(): void {
      socket.close();
    },
  };
}
