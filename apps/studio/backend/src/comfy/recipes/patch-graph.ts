import { randomInt } from 'node:crypto';
import type { ApiGraph } from './graph-schema.js';
import type { RecipeParam } from './manifest-schema.js';
import type { Recipe } from './recipe.js';

export type PatchValues = Record<string, string>;

export type PatchResult = {
  graph: ApiGraph;
  resolved: { width?: number; height?: number; [key: string]: string | number | undefined };
};

function writeFields(
  graph: ApiGraph,
  nodeId: string,
  fields: string[],
  values: unknown[],
): void {
  const node = graph[nodeId];
  if (!node) {
    throw new Error(`Internal: missing node ${nodeId}`);
  }
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field === undefined) continue;
    node.inputs[field] = values[i];
  }
}

function resolveParam(
  name: string,
  param: RecipeParam,
  raw: string | undefined,
  resolved: PatchResult['resolved'],
): unknown[] {
  if (param.type === 'text') {
    if (raw === undefined) {
      throw new Error(`Missing required param "${name}"`);
    }
    if (raw.length > param.maxLength) {
      throw new Error(`Param "${name}" exceeds maxLength ${param.maxLength}`);
    }
    resolved[name] = raw;
    return param.target.fields.map(() => raw);
  }

  const value = raw ?? param.default;
  const option = param.options.find((opt) => opt.value === value);
  if (!option) {
    throw new Error(`Param "${name}" has invalid value "${value}"`);
  }
  resolved[name] = value;
  if (option.sizes) {
    const { width, height } = option.sizes;
    resolved.width = width;
    resolved.height = height;
    return param.target.fields.map((field) => {
      if (field === 'width') return width;
      if (field === 'height') return height;
      throw new Error(`Param "${name}" sizes cannot map field "${field}"`);
    });
  }
  return param.target.fields.map(() => value);
}

/**
 * Clone the stored graph and write only manifest-allowed values.
 * Always assigns a fresh seed so ComfyUI cannot skip a regenerate via cache.
 */
export function patchGraph(
  recipe: Recipe,
  input: { jobId: string; values: PatchValues },
): PatchResult {
  const graph = structuredClone(recipe.graph);
  const resolved: PatchResult['resolved'] = {};
  const { manifest, titleToNodeId } = recipe;

  for (const name of Object.keys(input.values)) {
    if (!(name in manifest.params)) {
      throw new Error(`Unknown param "${name}"`);
    }
  }

  for (const [name, param] of Object.entries(manifest.params)) {
    const values = resolveParam(name, param, input.values[name], resolved);
    const nodeId = titleToNodeId.get(param.target.title);
    if (!nodeId) {
      throw new Error(`Internal: missing title ${param.target.title}`);
    }
    writeFields(graph, nodeId, param.target.fields, values);
  }

  const seedNodeId = titleToNodeId.get(manifest.seed.target.title);
  if (!seedNodeId) {
    throw new Error(`Internal: missing title ${manifest.seed.target.title}`);
  }
  // Node requires the exclusive upper bound to be < 2**48.
  const seed = randomInt(2 ** 48 - 1);
  writeFields(graph, seedNodeId, manifest.seed.target.fields, [seed]);
  resolved.seed = seed;

  const outNodeId = titleToNodeId.get(manifest.output.title);
  if (!outNodeId) {
    throw new Error(`Internal: missing title ${manifest.output.title}`);
  }
  const prefix = `studio/${input.jobId}`;
  writeFields(graph, outNodeId, [manifest.output.prefixField], [prefix]);
  resolved.filename_prefix = prefix;

  return { graph, resolved };
}
