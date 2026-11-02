import { randomInt } from 'node:crypto';
import type { ApiGraph } from './graph-schema.js';
import type { ManifestWrite, RecipeParam } from './manifest-schema.js';
import type { Recipe } from './recipe.js';

export type PatchValues = Record<string, string>;

export type PatchInputImage = {
  filename: string;
  width: number;
  height: number;
};

export type PatchResult = {
  graph: ApiGraph;
  resolved: { width?: number; height?: number; frames?: number; [key: string]: string | number | undefined };
};

const VIDEO_FPS = 24;

function writeFields(
  graph: ApiGraph,
  nodeId: string,
  fields: string[],
  values: unknown[],
): void {
  const node = graph[nodeId];
  if (!node) throw new Error(`Internal: missing node ${nodeId}`);
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field === undefined) continue;
    node.inputs[field] = values[i];
  }
}

function applyWrites(
  recipe: Recipe,
  graph: ApiGraph,
  writes: readonly ManifestWrite[],
  resolved: PatchResult['resolved'],
): void {
  for (const write of writes) {
    const nodeId = recipe.titleToNodeId.get(write.title);
    if (!nodeId) throw new Error(`Internal: missing title ${write.title}`);
    writeFields(graph, nodeId, [write.field], [write.value]);
    if (typeof write.value === 'number') {
      // Image recipes write IN_SIZE.width/height; video uses IN_WIDTH/IN_HEIGHT.value.
      if (write.field === 'width' || write.title === 'IN_WIDTH') {
        resolved.width = write.value;
      }
      if (write.field === 'height' || write.title === 'IN_HEIGHT') {
        resolved.height = write.value;
      }
      if (write.title === 'IN_DURATION' && write.field === 'value') {
        resolved.frames = write.value * VIDEO_FPS + 1;
      }
    }
  }
}

function resolveEnum(
  name: string,
  param: Extract<RecipeParam, { type: 'enum' }>,
  raw: string | undefined,
  recipe: Recipe,
  graph: ApiGraph,
  resolved: PatchResult['resolved'],
): void {
  const value = raw ?? param.default;
  const option = param.options.find((opt) => opt.value === value);
  if (!option) {
    throw new Error(`Param "${name}" has invalid value "${value}"`);
  }
  resolved[name] = value;

  if (option.writes && option.writes.length > 0) {
    applyWrites(recipe, graph, option.writes, resolved);
    return;
  }

  if (!param.target) return;
  const nodeId = recipe.titleToNodeId.get(param.target.title);
  if (!nodeId) {
    throw new Error(`Internal: missing title ${param.target.title}`);
  }
  writeFields(
    graph,
    nodeId,
    param.target.fields,
    param.target.fields.map(() => value),
  );
}

function resolveText(
  name: string,
  param: Extract<RecipeParam, { type: 'text' }>,
  raw: string | undefined,
  recipe: Recipe,
  graph: ApiGraph,
  resolved: PatchResult['resolved'],
): void {
  if (raw === undefined) throw new Error(`Missing required param "${name}"`);
  if (raw.length > param.maxLength) {
    throw new Error(`Param "${name}" exceeds maxLength ${param.maxLength}`);
  }
  resolved[name] = raw;
  const nodeId = recipe.titleToNodeId.get(param.target.title);
  if (!nodeId) {
    throw new Error(`Internal: missing title ${param.target.title}`);
  }
  writeFields(
    graph,
    nodeId,
    param.target.fields,
    param.target.fields.map(() => raw),
  );
}

function applyDerived(
  recipe: Recipe,
  graph: ApiGraph,
  resolved: PatchResult['resolved'],
): void {
  for (const rule of recipe.manifest.derived ?? []) {
    const [fromA, fromB] = rule.from;
    const a = resolved[fromA];
    const b = resolved[fromB];
    if (typeof a !== 'string' || typeof b !== 'string') {
      throw new Error(`Derived rule missing values for ${fromA}|${fromB}`);
    }
    const key = `${a}|${b}`;
    const writes = rule.table[key];
    if (!writes) {
      throw new Error(`Derived rule has no entry for "${key}"`);
    }
    applyWrites(recipe, graph, writes, resolved);
  }
}

function applyImages(
  recipe: Recipe,
  graph: ApiGraph,
  inputs: readonly PatchInputImage[],
  resolved: PatchResult['resolved'],
): void {
  const slots = recipe.manifest.images ?? [];
  if (slots.length === 0) {
    if (inputs.length > 0) {
      throw new Error('Recipe does not accept input images');
    }
    return;
  }

  const { min, max } = recipe.manifest.match.inputImages;
  if (inputs.length < min || inputs.length > max) {
    throw new Error(
      `Expected ${min}–${max} input images, got ${inputs.length}`,
    );
  }

  for (let i = 0; i < inputs.length; i++) {
    const slot = slots[i];
    const input = inputs[i];
    if (!slot || !input) continue;
    const nodeId = recipe.titleToNodeId.get(slot.title);
    if (!nodeId) throw new Error(`Internal: missing title ${slot.title}`);
    writeFields(graph, nodeId, [slot.field], [input.filename]);
    resolved[`image${i + 1}`] = input.filename;
  }

  // Drop unused trailing slots so example.png is never fed into the model.
  for (let i = inputs.length; i < slots.length; i++) {
    const slot = slots[i];
    if (!slot?.detach) continue;
    for (const d of slot.detach) {
      const nodeId = recipe.titleToNodeId.get(d.title);
      if (!nodeId) throw new Error(`Internal: missing title ${d.title}`);
      const node = graph[nodeId];
      if (!node) throw new Error(`Internal: missing node ${nodeId}`);
      const nextInputs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node.inputs)) {
        if (key !== d.input) nextInputs[key] = value;
      }
      node.inputs = nextInputs;
    }
  }

  const first = inputs[0];
  if (first && resolved.width === undefined) {
    resolved.width = first.width;
    resolved.height = first.height;
  }
}

/**
 * Clone the stored graph and write only manifest-allowed values.
 * Always assigns a fresh seed so ComfyUI cannot skip a regenerate via cache.
 */
export function patchGraph(
  recipe: Recipe,
  input: {
    jobId: string;
    values: PatchValues;
    inputs?: readonly PatchInputImage[];
  },
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
    if (param.type === 'text') {
      resolveText(name, param, input.values[name], recipe, graph, resolved);
    } else {
      resolveEnum(name, param, input.values[name], recipe, graph, resolved);
    }
  }

  applyDerived(recipe, graph, resolved);
  applyImages(recipe, graph, input.inputs ?? [], resolved);

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
