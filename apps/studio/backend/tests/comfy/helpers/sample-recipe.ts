import type { ApiGraph } from '../../../src/comfy/recipes/graph-schema.js';
import type { RecipeManifest } from '../../../src/comfy/recipes/manifest-schema.js';
import type { Recipe } from '../../../src/comfy/recipes/recipe.js';

export function sampleManifest(
  overrides: Partial<RecipeManifest> = {},
): RecipeManifest {
  return {
    id: 'image-create-fast',
    tool: 'image',
    timeoutSeconds: 120,
    match: {
      tool: 'image',
      inputImages: { min: 0, max: 0 },
      label: 'Create',
      placeholder: 'Describe the image you want',
      variant: {
        id: 'fast',
        label: 'Fast',
        icon: 'zap',
        default: true,
      },
    },
    params: {
      prompt: {
        type: 'text',
        label: 'Prompt',
        group: 'primary',
        maxLength: 1000,
        target: { title: 'IN_PROMPT', fields: ['text'] },
      },
      aspectRatio: {
        type: 'enum',
        label: 'Aspect ratio',
        group: 'primary',
        default: '1:1',
        options: [
          {
            value: '1:1',
            label: 'Square 1:1',
            sizes: { width: 1024, height: 1024 },
          },
          {
            value: '16:9',
            label: 'Landscape 16:9',
            sizes: { width: 1344, height: 768 },
          },
        ],
        target: { title: 'IN_SIZE', fields: ['width', 'height'] },
      },
    },
    seed: { target: { title: 'IN_SAMPLER', fields: ['seed'] } },
    output: { title: 'OUT_IMAGE', prefixField: 'filename_prefix' },
    ...overrides,
  };
}

export function sampleGraph(): ApiGraph {
  return {
    '57:27': {
      class_type: 'CLIPTextEncode',
      inputs: { text: 'placeholder', clip: ['57:30', 0] },
      _meta: { title: 'IN_PROMPT' },
    },
    '57:13': {
      class_type: 'EmptySD3LatentImage',
      inputs: { width: 1024, height: 1024, batch_size: 1 },
      _meta: { title: 'IN_SIZE' },
    },
    '57:3': {
      class_type: 'KSampler',
      inputs: {
        seed: 1,
        steps: 8,
        cfg: 1,
        sampler_name: 'res_multistep',
        scheduler: 'simple',
        denoise: 1,
        model: ['x', 0],
        positive: ['57:27', 0],
        negative: ['y', 0],
        latent_image: ['57:13', 0],
      },
      _meta: { title: 'IN_SAMPLER' },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'z-image-turbo', images: ['57:8', 0] },
      _meta: { title: 'OUT_IMAGE' },
    },
  };
}

export function sampleRecipe(): Recipe {
  const manifest = sampleManifest();
  const graph = sampleGraph();
  return {
    id: manifest.id,
    manifest,
    graph,
    titleToNodeId: new Map([
      ['IN_PROMPT', '57:27'],
      ['IN_SIZE', '57:13'],
      ['IN_SAMPLER', '57:3'],
      ['OUT_IMAGE', '9'],
    ]),
  };
}
