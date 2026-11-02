import { describe, expect, it } from 'vitest';
import { CapabilitiesService } from '../../src/services/capabilities.service.js';
import type { LimitsService } from '../../src/limits/limits.service.js';
import type { Recipe } from '../../src/comfy/recipes/recipe.js';

function videoRecipe(): Recipe {
  return {
    id: 'video-from-image',
    manifest: {
      id: 'video-from-image',
      tool: 'video',
      timeoutSeconds: 900,
      match: {
        tool: 'video',
        inputImages: { min: 1, max: 1 },
        label: 'Animate',
        placeholder: 'Describe how the image comes alive',
      },
      params: {
        prompt: {
          type: 'text',
          label: 'Prompt',
          group: 'primary',
          maxLength: 1000,
          target: { title: 'IN_PROMPT', fields: ['value'] },
        },
        aspectRatio: {
          type: 'enum',
          label: 'Aspect ratio',
          group: 'primary',
          default: '16:9',
          options: [{ value: '16:9', label: 'Landscape' }],
        },
      },
      seed: { target: { title: 'IN_SAMPLER', fields: ['noise_seed'] } },
      output: { title: 'OUT_VIDEO', prefixField: 'filename_prefix' },
      images: [{ title: 'IN_IMAGE_1', field: 'image', label: 'Start frame' }],
    },
    graph: {},
    titleToNodeId: new Map(),
  };
}

describe('capabilities with video modes', () => {
  it('exposes slot labels and never leaks engine words', async () => {
    const limits = {
      remaining: async () => ({
        image: { dailyRuns: 100, used: 0, remaining: 100 },
        video: { dailyRuns: 25, used: 0, remaining: 25 },
      }),
      resolvedLimits: async () => ({
        dailyRuns: { image: 100, video: 25 },
        perUserRunning: 1,
        perUserQueued: 3,
        globalQueued: 30,
      }),
    } as unknown as LimitsService;

    const service = new CapabilitiesService({
      recipes: new Map([['video-from-image', videoRecipe()]]),
      limits,
      getEngineState: () => 'ready',
    });
    const body = await service.getForUser('u1');
    const json = JSON.stringify(body);
    expect(json).not.toMatch(/IN_/);
    expect(json).not.toMatch(/OUT_/);
    expect(json).not.toContain('video-from-image');
    expect(json.toLowerCase()).not.toMatch(/\b(ltx|comfy|unet|vae)\b/);
    expect(body.tools[0]?.attachments.slots?.[0]?.label).toBe('Start frame');
    expect(body.tools[0]?.modes[0]?.slots?.[0]?.label).toBe('Start frame');
    expect(body.limits.video.dailyRuns).toBe(25);
  });
});
