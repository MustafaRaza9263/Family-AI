import { describe, expect, it } from 'vitest';
import { graphSchema } from '../../src/comfy/recipes/graph-schema.js';
import { manifestSchema } from '../../src/comfy/recipes/manifest-schema.js';
import { sampleGraph, sampleManifest } from './helpers/sample-recipe.js';

describe('manifestSchema', () => {
  it('accepts a valid manifest', () => {
    expect(manifestSchema.parse(sampleManifest()).id).toBe('image-create-fast');
  });

  it('rejects a missing required field', () => {
    const bad = { ...sampleManifest(), timeoutSeconds: undefined };
    expect(() => manifestSchema.parse(bad)).toThrow();
  });

  it('rejects an enum default that is not in options', () => {
    const manifest = sampleManifest();
    const aspect = manifest.params.aspectRatio;
    if (aspect?.type !== 'enum') throw new Error('expected enum');
    aspect.default = 'nope';
    expect(() => manifestSchema.parse(manifest)).toThrow(/default/);
  });
});

describe('graphSchema', () => {
  it('accepts a valid API graph', () => {
    const graph = graphSchema.parse(sampleGraph());
    expect(graph['57:27']?.class_type).toBe('CLIPTextEncode');
  });

  it('rejects a node missing class_type', () => {
    expect(() =>
      graphSchema.parse({
        '1': { inputs: {}, _meta: { title: 'X' } },
      }),
    ).toThrow();
  });
});
