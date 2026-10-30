import type { Env } from '../config/env.js';
import type { Logger } from '../lib/logger.js';
import {
  collectOutputFromHistory,
  historyLooksDone,
  type CollectedOutput,
} from './collect-output.js';
import { EngineError, EngineErrorCodes } from './errors.js';
import { createComfyHttp } from './http.js';
import { loadRecipes } from './recipes/load-recipes.js';
import { patchGraph, type PatchValues } from './recipes/patch-graph.js';
import type { Recipe } from './recipes/recipe.js';
import { runComfyPrompt } from './run-prompt.js';
import { createComfySocket } from './socket.js';
import type { ComfyHttp, ComfyQueueSnapshot, RunHooks } from './types.js';

export type CreateComfyOptions = {
  env: Env;
  logger: Logger;
  http?: ComfyHttp;
  onRawText?: (text: string) => void;
  onReconnect?: () => void;
};

export type ComfyRunResult = {
  outputs: Buffer[];
  files: { filename: string; subfolder: string; type: string }[];
  resolved: {
    width?: number;
    height?: number;
    [key: string]: string | number | undefined;
  };
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
  /** Fetch finished output for a known prompt id (boot recovery). */
  collect(recipeId: string, promptId: string): Promise<CollectedOutput>;
  queue(): Promise<ComfyQueueSnapshot>;
  interrupt(): Promise<void>;
  clearPrompt(promptId: string): Promise<void>;
  ping(): Promise<void>;
  close(): void;
};

export async function createComfy(
  opts: CreateComfyOptions,
): Promise<ComfyClient> {
  const recipes = await loadRecipes(opts.env.RECIPES_DIR);
  const http =
    opts.http ??
    createComfyHttp({
      baseUrl: opts.env.COMFY_URL,
      logger: opts.logger,
    });
  const socket = createComfySocket({
    baseUrl: opts.env.COMFY_URL,
    logger: opts.logger,
    onRawText: opts.onRawText,
    onConnected: opts.onReconnect,
  });

  function requireRecipe(recipeId: string): Recipe {
    const recipe = recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Unknown recipe "${recipeId}"`);
    }
    return recipe;
  }

  return {
    recipes,
    async ping(): Promise<void> {
      await http.ping();
    },
    async queue(): Promise<ComfyQueueSnapshot> {
      return http.queue();
    },
    async interrupt(): Promise<void> {
      await http.interrupt();
    },
    async clearPrompt(promptId: string): Promise<void> {
      await http.clearPrompt(promptId);
    },
    async collect(recipeId, promptId): Promise<CollectedOutput> {
      const recipe = requireRecipe(recipeId);
      const entry = await http.history(promptId);
      if (!entry || !historyLooksDone(entry)) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_BAD_OUTPUT,
          'Image engine produced no output',
        );
      }
      return collectOutputFromHistory(http, recipe, entry);
    },
    async run(recipeId, input): Promise<ComfyRunResult> {
      const recipe = requireRecipe(recipeId);
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
