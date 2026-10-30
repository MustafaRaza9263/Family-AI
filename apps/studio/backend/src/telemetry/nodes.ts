import type { NodeTiming, RunEvent } from './types.js';

export type OpenNode = {
  nodeId: string;
  nodeClass: string;
  nodeTitle?: string;
  startedAt: Date;
};

export type NodeTracker = {
  nodes: NodeTiming[];
  open: OpenNode | null;
};

export function createNodeTracker(): NodeTracker {
  return { nodes: [], open: null };
}

/**
 * Durations come from consecutive node_start times because ComfyUI runs these
 * graphs one node at a time; wall-clock gaps between starts are that node's work.
 */
export function applyRunEvent(tracker: NodeTracker, ev: RunEvent): void {
  if (ev.type === 'nodes_cached') {
    for (const node of ev.nodes) {
      const entry: NodeTiming = {
        nodeId: node.nodeId,
        class: node.nodeClass,
        ms: 0,
        cached: true,
      };
      if (node.nodeTitle !== undefined) {
        entry.title = node.nodeTitle;
      }
      tracker.nodes.push(entry);
    }
    return;
  }

  closeOpenNode(tracker, ev.at);
  tracker.open = {
    nodeId: ev.nodeId,
    nodeClass: ev.nodeClass,
    nodeTitle: ev.nodeTitle,
    startedAt: ev.at,
  };
}

export function closeOpenNode(tracker: NodeTracker, at: Date): void {
  if (!tracker.open) {
    return;
  }
  const ms = Math.max(0, at.getTime() - tracker.open.startedAt.getTime());
  const entry: NodeTiming = {
    nodeId: tracker.open.nodeId,
    class: tracker.open.nodeClass,
    ms,
    cached: false,
  };
  if (tracker.open.nodeTitle !== undefined) {
    entry.title = tracker.open.nodeTitle;
  }
  tracker.nodes.push(entry);
  tracker.open = null;
}
