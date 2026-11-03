import { finalizeHardware } from './aggregates.js';
import { computePhases } from './phases.js';
import type { RunState } from './run-tracker.js';
import type { RunSnapshot, SnapshotNode } from './types.js';

/** Non-mutating view of an active run for admin live detail. */
export function buildSnapshot(state: RunState, now: Date): RunSnapshot {
  const nodes: SnapshotNode[] = state.nodes.nodes.map((n) => ({ ...n }));
  if (state.nodes.open) {
    const open = state.nodes.open;
    const entry: SnapshotNode = {
      nodeId: open.nodeId,
      class: open.nodeClass,
      ms: Math.max(0, now.getTime() - open.startedAt.getTime()),
      cached: false,
      running: true,
    };
    if (open.nodeTitle !== undefined) entry.title = open.nodeTitle;
    nodes.push(entry);
  }
  return {
    jobId: state.jobId,
    nodes,
    phases: computePhases(nodes),
    hardware: finalizeHardware(state.hardware),
    elapsedMs: Math.max(0, now.getTime() - state.startedAt.getTime()),
  };
}
