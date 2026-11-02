import type { ApiGraph } from './graph-schema.js';
import type { DerivedRule, RecipeManifest } from './manifest-schema.js';

/** Boot-time: every option combo has a row; every write hits a real title/field. */
export function assertDerivedRules(
  recipeId: string,
  manifest: RecipeManifest,
  titleIndex: Map<string, string[]>,
  graph: ApiGraph,
): void {
  for (const [ruleIndex, rule] of (manifest.derived ?? []).entries()) {
    assertOneRule(recipeId, manifest, rule, ruleIndex, titleIndex, graph);
  }
}

function assertOneRule(
  recipeId: string,
  manifest: RecipeManifest,
  rule: DerivedRule,
  ruleIndex: number,
  titleIndex: Map<string, string[]>,
  graph: ApiGraph,
): void {
  const [fromA, fromB] = rule.from;
  const paramA = manifest.params[fromA];
  const paramB = manifest.params[fromB];
  if (!paramA || paramA.type !== 'enum') {
    throw new Error(
      `Recipe "${recipeId}": derived[${ruleIndex}].from[0] "${fromA}" must be an enum param`,
    );
  }
  if (!paramB || paramB.type !== 'enum') {
    throw new Error(
      `Recipe "${recipeId}": derived[${ruleIndex}].from[1] "${fromB}" must be an enum param`,
    );
  }

  for (const a of paramA.options) {
    for (const b of paramB.options) {
      const key = `${a.value}|${b.value}`;
      if (!(key in rule.table)) {
        throw new Error(
          `Recipe "${recipeId}": derived[${ruleIndex}] missing combination "${key}"`,
        );
      }
    }
  }

  for (const [key, writes] of Object.entries(rule.table)) {
    for (const write of writes) {
      assertWriteTarget(recipeId, write.title, write.field, titleIndex, graph);
    }
    void key;
  }
}

export function assertWriteTarget(
  recipeId: string,
  title: string,
  field: string,
  titleIndex: Map<string, string[]>,
  graph: ApiGraph,
): void {
  const ids = titleIndex.get(title) ?? [];
  if (ids.length === 0) {
    throw new Error(
      `Recipe "${recipeId}": write title "${title}" not found in workflow graph`,
    );
  }
  if (ids.length > 1) {
    throw new Error(
      `Recipe "${recipeId}": write title "${title}" appears ${ids.length} times`,
    );
  }
  const nodeId = ids[0];
  if (!nodeId) {
    throw new Error(
      `Recipe "${recipeId}": write title "${title}" not found in workflow graph`,
    );
  }
  const node = graph[nodeId];
  if (!node || !(field in node.inputs)) {
    throw new Error(
      `Recipe "${recipeId}": node "${title}" missing input field "${field}"`,
    );
  }
}
