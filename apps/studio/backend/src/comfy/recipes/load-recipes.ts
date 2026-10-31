import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { graphSchema, type ApiGraph } from './graph-schema.js';
import {
  manifestSchema,
  type ParamTarget,
  type RecipeManifest,
} from './manifest-schema.js';
import { assertRecipeMatchRules } from './match-validation.js';
import type { Recipe } from './recipe.js';

function buildTitleIndex(graph: ApiGraph): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const [nodeId, node] of Object.entries(graph)) {
    const title = node._meta?.title;
    if (!title) continue;
    const list = index.get(title) ?? [];
    list.push(nodeId);
    index.set(title, list);
  }
  return index;
}

function requireUniqueTitle(
  recipeId: string,
  title: string,
  titleIndex: Map<string, string[]>,
): string {
  const ids = titleIndex.get(title) ?? [];
  if (ids.length === 0) {
    throw new Error(
      `Recipe "${recipeId}": title "${title}" not found in workflow graph`,
    );
  }
  if (ids.length > 1) {
    throw new Error(
      `Recipe "${recipeId}": title "${title}" appears ${ids.length} times (ids: ${ids.join(', ')})`,
    );
  }
  const nodeId = ids[0];
  if (nodeId === undefined) {
    throw new Error(
      `Recipe "${recipeId}": title "${title}" not found in workflow graph`,
    );
  }
  return nodeId;
}

function assertTargetFields(
  recipeId: string,
  graph: ApiGraph,
  nodeId: string,
  target: ParamTarget,
): void {
  const node = graph[nodeId];
  if (!node) {
    throw new Error(
      `Recipe "${recipeId}": node id "${nodeId}" missing from graph`,
    );
  }
  for (const field of target.fields) {
    if (!(field in node.inputs)) {
      throw new Error(
        `Recipe "${recipeId}": node "${target.title}" (${nodeId}) missing input field "${field}"`,
      );
    }
  }
}

function assertInputField(
  recipeId: string,
  graph: ApiGraph,
  nodeId: string,
  title: string,
  field: string,
): void {
  const node = graph[nodeId];
  if (!node) {
    throw new Error(
      `Recipe "${recipeId}": node id "${nodeId}" missing from graph`,
    );
  }
  if (!(field in node.inputs)) {
    throw new Error(
      `Recipe "${recipeId}": node "${title}" (${nodeId}) missing input field "${field}"`,
    );
  }
}

function collectTargets(manifest: RecipeManifest): ParamTarget[] {
  const targets: ParamTarget[] = [manifest.seed.target];
  for (const param of Object.values(manifest.params)) {
    targets.push(param.target);
  }
  return targets;
}

function validateRecipe(
  manifest: RecipeManifest,
  graph: ApiGraph,
): Map<string, string> {
  const titleIndex = buildTitleIndex(graph);
  const titleToNodeId = new Map<string, string>();

  for (const target of collectTargets(manifest)) {
    const nodeId = requireUniqueTitle(manifest.id, target.title, titleIndex);
    assertTargetFields(manifest.id, graph, nodeId, target);
    titleToNodeId.set(target.title, nodeId);
  }

  const outId = requireUniqueTitle(manifest.id, manifest.output.title, titleIndex);
  assertTargetFields(manifest.id, graph, outId, {
    title: manifest.output.title,
    fields: [manifest.output.prefixField],
  });
  titleToNodeId.set(manifest.output.title, outId);

  for (const slot of manifest.images ?? []) {
    const nodeId = requireUniqueTitle(manifest.id, slot.title, titleIndex);
    assertInputField(manifest.id, graph, nodeId, slot.title, slot.field);
    titleToNodeId.set(slot.title, nodeId);
    for (const d of slot.detach ?? []) {
      const detachId = requireUniqueTitle(manifest.id, d.title, titleIndex);
      assertInputField(manifest.id, graph, detachId, d.title, d.input);
      titleToNodeId.set(d.title, detachId);
    }
  }

  return titleToNodeId;
}

async function loadOneRecipe(dir: string): Promise<Recipe> {
  const folder = path.basename(dir);
  const manifestRaw: unknown = JSON.parse(
    await readFile(path.join(dir, 'manifest.json'), 'utf8'),
  );
  const graphRaw: unknown = JSON.parse(
    await readFile(path.join(dir, 'workflow.api.json'), 'utf8'),
  );

  const manifest = manifestSchema.parse(manifestRaw);
  if (manifest.id !== folder) {
    throw new Error(
      `Recipe folder "${folder}" does not match manifest id "${manifest.id}"`,
    );
  }
  const graph = graphSchema.parse(graphRaw);
  const titleToNodeId = validateRecipe(manifest, graph);

  return { id: manifest.id, manifest, graph, titleToNodeId };
}

/** Read every recipe folder; fail boot if any title/field check fails. */
export async function loadRecipes(recipesDir: string): Promise<Map<string, Recipe>> {
  const entries = await readdir(recipesDir, { withFileTypes: true });
  const recipes = new Map<string, Recipe>();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const recipe = await loadOneRecipe(path.join(recipesDir, entry.name));
    recipes.set(recipe.id, recipe);
  }

  if (recipes.size === 0) {
    throw new Error(`No recipes found under ${recipesDir}`);
  }

  assertRecipeMatchRules([...recipes.values()].map((r) => r.manifest));
  return recipes;
}
