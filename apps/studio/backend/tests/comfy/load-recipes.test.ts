import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRecipes } from '../../src/comfy/recipes/load-recipes.js';
import { sampleGraph, sampleManifest } from './helpers/sample-recipe.js';

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

describe('loadRecipes title index', () => {
  it('loads a valid recipe folder', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'recipes-'));
    await writeRecipe(root, 'image-create-fast', sampleManifest(), sampleGraph());
    const recipes = await loadRecipes(root);
    expect(recipes.get('image-create-fast')?.titleToNodeId.get('IN_PROMPT')).toBe(
      '57:27',
    );
  });

  it('fails when a manifest title is missing from the graph', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'recipes-'));
    const graph = sampleGraph();
    delete graph['57:27'];
    await writeRecipe(root, 'image-create-fast', sampleManifest(), graph);
    await expect(loadRecipes(root)).rejects.toThrow(/IN_PROMPT/);
  });

  it('fails when a title appears more than once', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'recipes-'));
    const graph = sampleGraph();
    graph['dup'] = {
      class_type: 'CLIPTextEncode',
      inputs: { text: 'x' },
      _meta: { title: 'IN_PROMPT' },
    };
    await writeRecipe(root, 'image-create-fast', sampleManifest(), graph);
    await expect(loadRecipes(root)).rejects.toThrow(/appears 2 times/);
  });

  it('fails when a target field is missing on the node', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'recipes-'));
    const graph = sampleGraph();
    const promptNode = graph['57:27'];
    if (!promptNode) throw new Error('expected IN_PROMPT node');
    delete promptNode.inputs.text;
    await writeRecipe(root, 'image-create-fast', sampleManifest(), graph);
    await expect(loadRecipes(root)).rejects.toThrow(/missing input field "text"/);
  });
});
