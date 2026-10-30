import { describe, expect, it } from 'vitest';
import { patchGraph } from '../../src/comfy/recipes/patch-graph.js';
import { nodeInput } from './helpers/graph-access.js';
import { sampleRecipe } from './helpers/sample-recipe.js';

describe('patchGraph', () => {
  it('writes prompt, size, fresh seed and prefix without mutating the recipe', () => {
    const recipe = sampleRecipe();
    const originalSeed = nodeInput(recipe.graph, '57:3', 'seed');
    const originalPrompt = nodeInput(recipe.graph, '57:27', 'text');

    const { graph, resolved } = patchGraph(recipe, {
      jobId: 'job-1',
      values: { prompt: 'hello', aspectRatio: '16:9' },
    });

    expect(nodeInput(graph, '57:27', 'text')).toBe('hello');
    expect(nodeInput(graph, '57:13', 'width')).toBe(1344);
    expect(nodeInput(graph, '57:13', 'height')).toBe(768);
    expect(nodeInput(graph, '57:13', 'batch_size')).toBe(1);
    expect(nodeInput(graph, '9', 'filename_prefix')).toBe('studio/job-1');
    expect(nodeInput(graph, '57:3', 'seed')).not.toBe(originalSeed);
    expect(resolved.width).toBe(1344);
    expect(resolved.height).toBe(768);

    expect(nodeInput(recipe.graph, '57:27', 'text')).toBe(originalPrompt);
    expect(nodeInput(recipe.graph, '57:3', 'seed')).toBe(originalSeed);
  });

  it('returns different seeds across calls', () => {
    const recipe = sampleRecipe();
    const a = patchGraph(recipe, { jobId: 'a', values: { prompt: 'x' } });
    const b = patchGraph(recipe, { jobId: 'b', values: { prompt: 'x' } });
    expect(nodeInput(a.graph, '57:3', 'seed')).not.toBe(
      nodeInput(b.graph, '57:3', 'seed'),
    );
  });

  it('applies the default aspect ratio when omitted', () => {
    const { resolved } = patchGraph(sampleRecipe(), {
      jobId: 'j',
      values: { prompt: 'x' },
    });
    expect(resolved.width).toBe(1024);
    expect(resolved.height).toBe(1024);
    expect(resolved.aspectRatio).toBe('1:1');
  });

  it('rejects unknown params and bad enum values', () => {
    const recipe = sampleRecipe();
    expect(() =>
      patchGraph(recipe, { jobId: 'j', values: { prompt: 'x', nope: '1' } }),
    ).toThrow(/Unknown param/);
    expect(() =>
      patchGraph(recipe, {
        jobId: 'j',
        values: { prompt: 'x', aspectRatio: '3:2' },
      }),
    ).toThrow(/invalid value/);
  });
});
