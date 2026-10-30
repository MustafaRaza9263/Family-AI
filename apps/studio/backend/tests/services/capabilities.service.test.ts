import { describe, expect, it } from 'vitest';
import { sampleRecipe } from '../comfy/helpers/sample-recipe.js';
import { CapabilitiesService } from '../../src/services/capabilities.service.js';
import type { LimitsService } from '../../src/limits/limits.service.js';

describe('CapabilitiesService', () => {
  it('serialized JSON contains no node titles, recipe ids, or model words', async () => {
    const recipe = sampleRecipe();
    const limits = {
      remaining: async () => ({
        image: { dailyRuns: 100, used: 0, remaining: 100 },
        video: { dailyRuns: 10, used: 0, remaining: 10 },
      }),
      resolvedLimits: async () => ({
        dailyRuns: { image: 100, video: 10 },
        perUserRunning: 1,
        perUserQueued: 3,
        globalQueued: 30,
      }),
    } as unknown as LimitsService;

    const service = new CapabilitiesService({
      recipes: new Map([[recipe.id, recipe]]),
      limits,
      getEngineState: () => 'ready',
    });

    const body = await service.getForUser('user1');
    const json = JSON.stringify(body);

    expect(json).not.toMatch(/IN_/);
    expect(json).not.toMatch(/OUT_/);
    expect(json).not.toContain('image-create-fast');
    expect(json.toLowerCase()).not.toMatch(/\b(flux|z-image|comfy|unet|clip)\b/);
    expect(body.tools[0]?.modes[0]?.controls.some((c) => c.id === 'aspectRatio')).toBe(
      true,
    );
  });
});
