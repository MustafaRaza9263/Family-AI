import { describe, expect, it } from 'vitest';
import { patchGraph } from '../../src/comfy/recipes/patch-graph.js';
import type { Recipe } from '../../src/comfy/recipes/recipe.js';
import { nodeInput } from './helpers/graph-access.js';

function videoRecipe(): Recipe {
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
        duration: {
          type: 'enum',
          label: 'Duration',
          group: 'primary',
          default: '5',
          options: [
            {
              value: '5',
              label: '5 s',
              writes: [{ title: 'IN_DURATION', field: 'value', value: 5 }],
            },
            {
              value: '8',
              label: '8 s',
              writes: [{ title: 'IN_DURATION', field: 'value', value: 8 }],
            },
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
            '16:9|hd': [
              { title: 'IN_WIDTH', field: 'value', value: 1408 },
              { title: 'IN_HEIGHT', field: 'value', value: 768 },
            ],
            '1:1|standard': [
              { title: 'IN_WIDTH', field: 'value', value: 768 },
              { title: 'IN_HEIGHT', field: 'value', value: 768 },
            ],
            '1:1|hd': [
              { title: 'IN_WIDTH', field: 'value', value: 1024 },
              { title: 'IN_HEIGHT', field: 'value', value: 1024 },
            ],
          },
        },
      ],
      seed: { target: { title: 'IN_SAMPLER', fields: ['noise_seed'] } },
      output: { title: 'OUT_VIDEO', prefixField: 'filename_prefix' },
    },
    graph: {
      p: {
        class_type: 'PrimitiveStringMultiline',
        inputs: { value: '' },
        _meta: { title: 'IN_PROMPT' },
      },
      w: {
        class_type: 'PrimitiveInt',
        inputs: { value: 1 },
        _meta: { title: 'IN_WIDTH' },
      },
      h: {
        class_type: 'PrimitiveInt',
        inputs: { value: 1 },
        _meta: { title: 'IN_HEIGHT' },
      },
      d: {
        class_type: 'PrimitiveInt',
        inputs: { value: 1 },
        _meta: { title: 'IN_DURATION' },
      },
      s: {
        class_type: 'RandomNoise',
        inputs: { noise_seed: 1 },
        _meta: { title: 'IN_SAMPLER' },
      },
      o: {
        class_type: 'SaveVideo',
        inputs: { filename_prefix: 'x', format: 'auto' },
        _meta: { title: 'OUT_VIDEO' },
      },
    },
    titleToNodeId: new Map([
      ['IN_PROMPT', 'p'],
      ['IN_WIDTH', 'w'],
      ['IN_HEIGHT', 'h'],
      ['IN_DURATION', 'd'],
      ['IN_SAMPLER', 's'],
      ['OUT_VIDEO', 'o'],
    ]),
  };
}

describe('patchGraph video writes', () => {
  it('writes duration seconds and derived final size; resolves frames', () => {
    const recipe = videoRecipe();
    const { graph, resolved } = patchGraph(recipe, {
      jobId: 'job-v',
      values: {
        prompt: 'motion',
        aspectRatio: '16:9',
        quality: 'hd',
        duration: '8',
      },
    });
    expect(nodeInput(graph, 'd', 'value')).toBe(8);
    expect(nodeInput(graph, 'w', 'value')).toBe(1408);
    expect(nodeInput(graph, 'h', 'value')).toBe(768);
    expect(resolved.frames).toBe(8 * 24 + 1);
    expect(resolved.width).toBe(1408);
    expect(resolved.height).toBe(768);
  });
});
