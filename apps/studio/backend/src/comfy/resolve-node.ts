import type { ApiGraph } from './recipes/graph-schema.js';
import type { CachedNodeInfo } from './types.js';

/** Resolve class/title from the submitted graph; ids not in the graph stay opaque. */
export function resolveNodeInfo(
  graph: ApiGraph,
  nodeId: string,
  displayNode?: string,
): CachedNodeInfo {
  const primary = graph[nodeId];
  if (primary) {
    const info: CachedNodeInfo = {
      nodeId,
      nodeClass: primary.class_type,
    };
    if (primary._meta?.title !== undefined) {
      info.nodeTitle = primary._meta.title;
    }
    return info;
  }

  if (displayNode) {
    const fallback = graph[displayNode];
    if (fallback) {
      const info: CachedNodeInfo = {
        nodeId,
        nodeClass: fallback.class_type,
      };
      if (fallback._meta?.title !== undefined) {
        info.nodeTitle = fallback._meta.title;
      }
      return info;
    }
  }

  return { nodeId, nodeClass: 'unknown' };
}
