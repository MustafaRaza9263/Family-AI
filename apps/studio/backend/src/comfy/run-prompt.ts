import { randomUUID } from 'node:crypto';
import type { Logger } from '../lib/logger.js';
import {
  collectOutputFromHistory,
  historyLooksDone,
  type CollectedOutput,
} from './collect-output.js';
import { EngineError, EngineErrorCodes } from './errors.js';
import type { ApiGraph } from './recipes/graph-schema.js';
import type { Recipe } from './recipes/recipe.js';
import { handlePromptEvent } from './run-prompt-handlers.js';
import type { FinishReason } from './run-prompt-handlers.js';
import type { ComfyEvents, ComfyHttp, RunHooks } from './types.js';

const HISTORY_POLL_MS = 5_000;

export type RunComfyPromptInput = {
  http: ComfyHttp;
  events: ComfyEvents;
  clientId: string;
  recipe: Recipe;
  graph: ApiGraph;
  hooks?: RunHooks;
  signal?: AbortSignal;
  timeoutMs: number;
  logger: Logger;
};

export async function runComfyPrompt(
  input: RunComfyPromptInput,
): Promise<CollectedOutput> {
  const hooks = input.hooks ?? {};
  const promptId = randomUUID();
  let settled = false;
  const timers: {
    poll?: ReturnType<typeof setInterval>;
    timeout?: ReturnType<typeof setTimeout>;
  } = {};

  let resolveFinish!: (reason: FinishReason) => void;
  const finished = new Promise<FinishReason>((resolve) => {
    resolveFinish = resolve;
  });

  const finish = (reason: FinishReason): void => {
    if (settled) return;
    settled = true;
    unsubscribe();
    if (timers.poll) clearInterval(timers.poll);
    if (timers.timeout) clearTimeout(timers.timeout);
    input.signal?.removeEventListener('abort', onAbort);
    resolveFinish(reason);
  };

  const onAbort = (): void => {
    void input.http.interrupt().catch(() => undefined);
    finish({
      kind: 'error',
      error: new EngineError(
        EngineErrorCodes.ENGINE_CANCELLED,
        'Image generation was cancelled',
      ),
    });
  };

  const unsubscribe = input.events.subscribe(promptId, (event) => {
    handlePromptEvent(
      { graph: input.graph, hooks, logger: input.logger, finish },
      event,
    );
  });

  if (input.signal?.aborted) {
    onAbort();
  } else {
    input.signal?.addEventListener('abort', onAbort, { once: true });
  }

  timers.timeout = setTimeout(() => {
    void input.http.interrupt().catch(() => undefined);
    finish({
      kind: 'error',
      error: new EngineError(
        EngineErrorCodes.ENGINE_TIMEOUT,
        'Image generation timed out',
      ),
    });
  }, input.timeoutMs);

  timers.poll = setInterval(() => {
    void (async () => {
      const entry = await input.http.history(promptId);
      if (entry && historyLooksDone(entry)) {
        finish({ kind: 'success' });
      }
    })();
  }, HISTORY_POLL_MS);

  if (!settled) {
    try {
      const returnedId = await input.http.submit(
        input.graph,
        input.clientId,
        promptId,
      );
      if (returnedId !== promptId) {
        input.logger.warn(
          { expected: promptId, returnedId },
          'comfy prompt_id mismatch',
        );
      }
      hooks.onSubmitted?.(promptId);
    } catch (err) {
      finish({
        kind: 'error',
        error:
          err instanceof EngineError
            ? err
            : new EngineError(
                EngineErrorCodes.ENGINE_FAILED,
                'Image generation failed',
              ),
      });
    }
  }

  const reason = await finished;
  if (reason.kind === 'error') {
    throw reason.error;
  }

  const entry = await input.http.history(promptId);
  if (!entry) {
    throw new EngineError(
      EngineErrorCodes.ENGINE_BAD_OUTPUT,
      'Image engine produced no output',
    );
  }
  return collectOutputFromHistory(input.http, input.recipe, entry);
}
