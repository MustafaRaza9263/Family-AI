import type { ComfyClient, ComfyRunResult } from '../../src/comfy/create-comfy.js';
import type { CollectedOutput } from '../../src/comfy/collect-output.js';
import type { Recipe } from '../../src/comfy/recipes/recipe.js';
import type { RunHooks } from '../../src/comfy/types.js';
import { EngineError, EngineErrorCodes } from '../../src/comfy/errors.js';

export type FakeComfyClient = ComfyClient & {
  runs: Array<{ recipeId: string; jobId: string }>;
  warmUpRuns: number;
  failNext?: EngineError;
  hangUntilAbort?: boolean;
  history: Map<string, CollectedOutput>;
  heldPromptIds: Set<string>;
  interruptCalls: number;
  clearCalls: string[];
  pingOk: boolean;
};

export function createFakeComfyClient(
  recipes: Map<string, Recipe> = new Map([
    [
      'image-create-fast',
      {
        id: 'image-create-fast',
        manifest: {
          id: 'image-create-fast',
          tool: 'image' as const,
          timeoutSeconds: 60,
          match: {
            tool: 'image' as const,
            inputImages: { min: 0, max: 0 },
            variant: {
              id: 'fast',
              label: 'Fast',
              icon: 'zap',
              default: true,
            },
          },
          params: {},
          seed: { target: { title: 'IN_SAMPLER', fields: ['seed'] } },
          output: { title: 'OUT_IMAGE', prefixField: 'filename_prefix' },
        },
        graph: {},
        titleToNodeId: new Map(),
      },
    ],
  ]),
): FakeComfyClient {
  const fake: FakeComfyClient = {
    recipes,
    runs: [],
    warmUpRuns: 0,
    history: new Map(),
    heldPromptIds: new Set(),
    interruptCalls: 0,
    clearCalls: [],
    pingOk: true,
    async ping() {
      if (!fake.pingOk) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_UNAVAILABLE,
          'down',
        );
      }
    },
    async queue() {
      return {
        running: [...fake.heldPromptIds],
        pending: [],
      };
    },
    async interrupt() {
      fake.interruptCalls += 1;
    },
    async clearPrompt(promptId) {
      fake.clearCalls.push(promptId);
      fake.heldPromptIds.delete(promptId);
    },
    async collect(recipeId, promptId) {
      void recipeId;
      const out = fake.history.get(promptId);
      if (!out) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_BAD_OUTPUT,
          'no output',
        );
      }
      return out;
    },
    async run(recipeId, input): Promise<ComfyRunResult> {
      fake.runs.push({ recipeId, jobId: input.jobId });
      if (input.jobId.startsWith('warmup-')) {
        fake.warmUpRuns += 1;
      }
      if (fake.hangUntilAbort) {
        await waitAbort(input.signal);
        throw new EngineError(
          EngineErrorCodes.ENGINE_CANCELLED,
          'cancelled',
        );
      }
      if (fake.failNext) {
        const err = fake.failNext;
        fake.failNext = undefined;
        throw err;
      }
      const hooks: RunHooks = input.hooks ?? {};
      const promptId = `prompt-${input.jobId}`;
      hooks.onSubmitted?.(promptId);
      hooks.onCached?.([
        { nodeId: '1', nodeClass: 'CLIPLoader', nodeTitle: 'Load CLIP' },
      ]);
      hooks.onNodeStart?.({
        nodeId: '2',
        nodeClass: 'KSampler',
        nodeTitle: 'IN_SAMPLER',
        at: new Date(),
      });
      hooks.onProgress?.({ nodeId: '2', value: 1, max: 8 });
      hooks.onNodeStart?.({
        nodeId: '3',
        nodeClass: 'VAEDecode',
        at: new Date(),
      });
      return {
        outputs: [Buffer.from('fake-png')],
        files: [{ filename: 'x.png', subfolder: '', type: 'output' }],
        resolved: { width: 64, height: 64 },
      };
    },
    close() {
      // no-op
    },
  };
  return fake;
}

function waitAbort(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!signal) {
      reject(new Error('no signal'));
      return;
    }
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener('abort', () => resolve(), { once: true });
  });
}
