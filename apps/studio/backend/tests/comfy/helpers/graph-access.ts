import type { ApiGraph } from '../../../src/comfy/recipes/graph-schema.js';

/** Test helper: read a node input without non-null assertions. */
export function nodeInput(
  graph: ApiGraph,
  nodeId: string,
  field: string,
): unknown {
  const node = graph[nodeId];
  if (!node) {
    throw new Error(`missing node ${nodeId}`);
  }
  return node.inputs[field];
}
