import { describe, expect, it } from 'vitest';
import { collectOutputFromHistory } from '../../src/comfy/collect-output.js';
import type { ComfyHistoryEntry, ComfyHttp } from '../../src/comfy/types.js';
import type { Recipe } from '../../src/comfy/recipes/recipe.js';

function recipe(): Recipe {
  return {
    id: 'video-from-text',
    manifest: {
      id: 'video-from-text',
      tool: 'video',
      timeoutSeconds: 900,
      match: {
        tool: 'video',
        inputImages: { min: 0, max: 0 },
        label: 'Create',
        placeholder: 'x',
      },
      params: {},
      seed: { target: { title: 'IN_SAMPLER', fields: ['noise_seed'] } },
      output: { title: 'OUT_VIDEO', prefixField: 'filename_prefix' },
    },
    graph: {},
    titleToNodeId: new Map([['OUT_VIDEO', '75']]),
  };
}

function httpWith(bytes: Buffer): ComfyHttp {
  return {
    async submit() {
      return 'p';
    },
    async history() {
      return null;
    },
    async view() {
      return bytes;
    },
    async interrupt() {},
    async queue() {
      return { running: [], pending: [] };
    },
    async clearPrompt() {},
    async ping() {},
    async uploadImage() {
      return { name: 'x', subfolder: '', type: 'input' };
    },
  };
}

describe('collectOutputFromHistory video keys', () => {
  for (const key of ['images', 'videos', 'gifs'] as const) {
    it(`reads the first file under ${key}`, async () => {
      const entry: ComfyHistoryEntry = {
        outputs: {
          '75': {
            [key]: [
              { filename: `clip.${key === 'images' ? 'png' : 'mp4'}`, subfolder: '', type: 'output' },
            ],
          },
        },
      };
      const result = await collectOutputFromHistory(
        httpWith(Buffer.from('bytes')),
        recipe(),
        entry,
      );
      expect(result.outputs[0]?.toString()).toBe('bytes');
      expect(result.extension).toBe(key === 'images' ? 'png' : 'mp4');
      expect(result.kind).toBe(key === 'images' ? 'image' : 'video');
    });
  }
});
