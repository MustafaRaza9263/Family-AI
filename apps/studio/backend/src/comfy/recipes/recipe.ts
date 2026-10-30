import type { ApiGraph } from './graph-schema.js';
import type { RecipeManifest } from './manifest-schema.js';

/** Loaded recipe: validated files plus a boot-time title → nodeId index. */
export type Recipe = {
  id: string;
  manifest: RecipeManifest;
  graph: ApiGraph;
  titleToNodeId: ReadonlyMap<string, string>;
};
