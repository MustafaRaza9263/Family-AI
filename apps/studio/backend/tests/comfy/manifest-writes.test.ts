import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRecipes } from '../../src/comfy/recipes/load-recipes.js';
import { normalizeManifestSizes } from '../../src/comfy/recipes/normalize-manifest.js';
import { patchGraph } from '../../src/comfy/recipes/patch-graph.js';
import { sampleGraph, sampleManifest, sampleRecipe } from './helpers/sample-recipe.js';
import { nodeInput } from './helpers/graph-access.js';

async function writeRecipe(
  root: string,
  id: string,
  manifest: unknown,
  graph: unknown,
): Promise<void> {
  const dir = path.join(root, id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(path.join(dir, 'workflow.api.json'), JSON.stringify(graph));
}

describe('manifest writes + derived', () => {
  it('normalizes sizes into writes for IN_SIZE', () => {
    // Build a pre-normalize shape (sizes still present).
    const withSizes = {
      ...sampleManifest(),
      params: {
        ...sampleManifest().params,
        aspectRatio: {
          type: 'enum' as const,
          label: 'Aspect ratio',
          group: 'primary' as const,
          default: '1:1',
          options: [
            {
              value: '16:9',
              label: 'Landscape 16:9',
              sizes: { width: 1344, height: 768 },
            },
          ],
          target: { title: 'IN_SIZE', fields: ['width', 'height'] },
        },
      },
    };
    const normalized = normalizeManifestSizes(withSizes);
    const aspect = normalized.params.aspectRatio;
    if (aspect?.type !== 'enum') throw new Error('expected enum');
    const opt = aspect.options.find((o) => o.value === '16:9');
    expect(opt?.sizes).toBeUndefined();
    expect(opt?.writes).toEqual([
      { title: 'IN_SIZE', field: 'width', value: 1344 },
      { title: 'IN_SIZE', field: 'height', value: 768 },
    ]);
  });

  it('patchGraph applies option writes after sizes normalization', () => {
    const recipe = sampleRecipe();
    const { graph, resolved } = patchGraph(recipe, {
      jobId: 'j',
      values: { prompt: 'x', aspectRatio: '16:9' },
    });
    expect(nodeInput(graph, '57:13', 'width')).toBe(1344);
    expect(nodeInput(graph, '57:13', 'height')).toBe(768);
    expect(resolved.width).toBe(1344);
    expect(resolved.height).toBe(768);
  });

  it('rejects a derived table missing a combination', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'recipes-'));
    const manifest = {
      id: 'video-from-text',
      tool: 'video',
      timeoutSeconds: 900,
      match: {
        tool: 'video',
        inputImages: { min: 0, max: 0 },
        label: 'Create',
        placeholder: 'Describe',
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
          label: 'Aspect',
          group: 'primary',
          default: '16:9',
          options: [
            { value: '16:9', label: 'Landscape' },
            { value: '1:1', label: 'Square' },
          ],
        },
        quality: {
          type: 'enum',
          label: 'Quality',
          group: 'primary',
          default: 'standard',
          options: [
            { value: 'standard', label: 'Standard' },
            { value: 'hd', label: 'HD' },
          ],
        },
      },
      derived: [
        {
          from: ['aspectRatio', 'quality'],
          table: {
            '16:9|standard': [
              { title: 'IN_WIDTH', field: 'value', value: 1024 },
              { title: 'IN_HEIGHT', field: 'value', value: 576 },
            ],
          },
        },
      ],
      seed: { target: { title: 'IN_SAMPLER', fields: ['noise_seed'] } },
      output: { title: 'OUT_VIDEO', prefixField: 'filename_prefix' },
    };
    const graph = {
      a: {
        class_type: 'PrimitiveStringMultiline',
        inputs: { value: '' },
        _meta: { title: 'IN_PROMPT' },
      },
      b: {
        class_type: 'PrimitiveInt',
        inputs: { value: 1024 },
        _meta: { title: 'IN_WIDTH' },
      },
      c: {
        class_type: 'PrimitiveInt',
        inputs: { value: 576 },
        _meta: { title: 'IN_HEIGHT' },
      },
      d: {
        class_type: 'RandomNoise',
        inputs: { noise_seed: 1 },
        _meta: { title: 'IN_SAMPLER' },
      },
      e: {
        class_type: 'SaveVideo',
        inputs: { filename_prefix: 'x', format: 'auto' },
        _meta: { title: 'OUT_VIDEO' },
      },
    };
    await writeRecipe(root, 'video-from-text', manifest, graph);
    await expect(loadRecipes(root)).rejects.toThrow(/missing combination/);
  });

  it('still loads image recipes that use sizes', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'recipes-'));
    await writeRecipe(root, 'image-create-fast', sampleManifest(), sampleGraph());
    const recipes = await loadRecipes(root);
    const recipe = recipes.get('image-create-fast');
    if (!recipe) throw new Error('expected recipe');
    const aspect = recipe.manifest.params.aspectRatio;
    if (aspect?.type !== 'enum') throw new Error('expected enum');
    expect(aspect.options[0]?.writes?.length).toBeGreaterThan(0);
  });
});
