import { describe, expect, it } from 'vitest';
import { patchGraph } from '../../src/comfy/recipes/patch-graph.js';
import type { ApiGraph } from '../../src/comfy/recipes/graph-schema.js';
import type { Recipe } from '../../src/comfy/recipes/recipe.js';
import { sampleManifest } from './helpers/sample-recipe.js';
import { nodeInput } from './helpers/graph-access.js';

function referenceRecipe(): Recipe {
  const manifest = sampleManifest({
    id: 'image-reference',
    match: {
      tool: 'image',
      inputImages: { min: 2, max: 4 },
      label: 'Combine',
      placeholder: 'Combine them',
    },
    images: [
      { title: 'IN_IMAGE_1', field: 'image' },
      { title: 'IN_IMAGE_2', field: 'image' },
      {
        title: 'IN_IMAGE_3',
        field: 'image',
        detach: [
          { title: 'IN_IMAGE_BATCH', input: 'images.image2' },
          { title: 'IN_REFERENCES', input: 'images.image2' },
        ],
      },
      {
        title: 'IN_IMAGE_4',
        field: 'image',
        detach: [
          { title: 'IN_IMAGE_BATCH', input: 'images.image3' },
          { title: 'IN_REFERENCES', input: 'images.image3' },
        ],
      },
    ],
  });

  const graph: ApiGraph = {
    '28': {
      class_type: 'PrimitiveStringMultiline',
      inputs: { value: '' },
      _meta: { title: 'IN_PROMPT' },
    },
    '133': {
      class_type: 'LoadImage',
      inputs: { image: 'example.png' },
      _meta: { title: 'IN_IMAGE_1' },
    },
    '147': {
      class_type: 'LoadImage',
      inputs: { image: 'example.png' },
      _meta: { title: 'IN_IMAGE_2' },
    },
    '148': {
      class_type: 'LoadImage',
      inputs: { image: 'example.png' },
      _meta: { title: 'IN_IMAGE_3' },
    },
    '149': {
      class_type: 'LoadImage',
      inputs: { image: 'example.png' },
      _meta: { title: 'IN_IMAGE_4' },
    },
    batch: {
      class_type: 'BatchImagesNode',
      inputs: {
        'images.image0': ['133', 0],
        'images.image1': ['147', 0],
        'images.image2': ['148', 0],
        'images.image3': ['149', 0],
      },
      _meta: { title: 'IN_IMAGE_BATCH' },
    },
    refs: {
      class_type: 'ReferenceMultiLatent',
      inputs: {
        'images.image0': ['133', 0],
        'images.image1': ['147', 0],
        'images.image2': ['148', 0],
        'images.image3': ['149', 0],
      },
      _meta: { title: 'IN_REFERENCES' },
    },
    size: {
      class_type: 'EmptyFlux2LatentImage',
      inputs: { width: 1024, height: 1024, batch_size: 1 },
      _meta: { title: 'IN_SIZE' },
    },
    sampler: {
      class_type: 'KSampler',
      inputs: { seed: 1 },
      _meta: { title: 'IN_SAMPLER' },
    },
    out: {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'x', images: ['x', 0] },
      _meta: { title: 'OUT_IMAGE' },
    },
  };

  // Reference recipes still need the create params from sampleManifest —
  // remap prompt target to PrimitiveStringMultiline value field.
  manifest.params.prompt = {
    type: 'text',
    label: 'Prompt',
    group: 'primary',
    maxLength: 1000,
    target: { title: 'IN_PROMPT', fields: ['value'] },
  };

  return {
    id: manifest.id,
    manifest,
    graph,
    titleToNodeId: new Map([
      ['IN_PROMPT', '28'],
      ['IN_IMAGE_1', '133'],
      ['IN_IMAGE_2', '147'],
      ['IN_IMAGE_3', '148'],
      ['IN_IMAGE_4', '149'],
      ['IN_IMAGE_BATCH', 'batch'],
      ['IN_REFERENCES', 'refs'],
      ['IN_SIZE', 'size'],
      ['IN_SAMPLER', 'sampler'],
      ['OUT_IMAGE', 'out'],
    ]),
  };
}

describe('patchGraph input images', () => {
  it('writes filenames and detaches unused reference slots', () => {
    const recipe = referenceRecipe();
    const { graph } = patchGraph(recipe, {
      jobId: 'job-ref',
      values: { prompt: 'merge', aspectRatio: '1:1' },
      inputs: [
        { filename: 'studio/a.png', width: 800, height: 600 },
        { filename: 'studio/b.png', width: 640, height: 480 },
      ],
    });

    expect(nodeInput(graph, '133', 'image')).toBe('studio/a.png');
    expect(nodeInput(graph, '147', 'image')).toBe('studio/b.png');
    expect(graph.batch?.inputs['images.image2']).toBeUndefined();
    expect(graph.batch?.inputs['images.image3']).toBeUndefined();
    expect(graph.refs?.inputs['images.image2']).toBeUndefined();
    expect(graph.refs?.inputs['images.image3']).toBeUndefined();
    expect(graph.batch?.inputs['images.image0']).toEqual(['133', 0]);
    expect(graph.batch?.inputs['images.image1']).toEqual(['147', 0]);
  });

  it('keeps all four slots when four images are attached', () => {
    const recipe = referenceRecipe();
    const { graph } = patchGraph(recipe, {
      jobId: 'job-ref4',
      values: { prompt: 'merge', aspectRatio: '1:1' },
      inputs: [
        { filename: '1.png', width: 1, height: 1 },
        { filename: '2.png', width: 1, height: 1 },
        { filename: '3.png', width: 1, height: 1 },
        { filename: '4.png', width: 1, height: 1 },
      ],
    });
    expect(graph.batch?.inputs['images.image3']).toEqual(['149', 0]);
    expect(nodeInput(graph, '149', 'image')).toBe('4.png');
  });
});
