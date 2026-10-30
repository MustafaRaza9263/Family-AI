import {
  createHardwareAccum,
  finalizeHardware,
  foldSample,
  type HardwareAccum,
} from './aggregates.js';
import {
  applyRunEvent,
  closeOpenNode,
  createNodeTracker,
  type NodeTracker,
} from './nodes.js';
import { computePhases } from './phases.js';
import type { JobMetricsRow } from './schema.js';
import type {
  HardwareSample,
  RunEnd,
  RunEvent,
  RunMeta,
} from './types.js';

export type RunState = {
  jobId: string;
  meta: RunMeta;
  startedAt: Date;
  nodes: NodeTracker;
  hardware: HardwareAccum;
  ended: boolean;
};

export function createRunState(jobId: string, meta: RunMeta, startedAt: Date): RunState {
  return {
    jobId,
    meta,
    startedAt,
    nodes: createNodeTracker(),
    hardware: createHardwareAccum(),
    ended: false,
  };
}

export function trackEvent(state: RunState, ev: RunEvent): void {
  applyRunEvent(state.nodes, ev);
}

export function trackSample(state: RunState, sample: HardwareSample): void {
  foldSample(state.hardware, sample);
}

export function buildRow(
  state: RunState,
  end: RunEnd,
  finishedAt: Date,
): JobMetricsRow {
  closeOpenNode(state.nodes, finishedAt);
  const queueWaitMs = Math.max(
    0,
    state.startedAt.getTime() - state.meta.queuedAt.getTime(),
  );
  const runMs = Math.max(0, finishedAt.getTime() - state.startedAt.getTime());
  const row: JobMetricsRow = {
    jobId: state.jobId,
    userId: state.meta.userId,
    recipeId: state.meta.recipeId,
    tool: state.meta.tool,
    status: end.status,
    queuedAt: state.meta.queuedAt,
    startedAt: state.startedAt,
    finishedAt,
    queueWaitMs,
    runMs,
    nodes: state.nodes.nodes,
    phases: computePhases(state.nodes.nodes),
    hardware: finalizeHardware(state.hardware),
    createdAt: finishedAt,
  };
  if (end.errorCode !== undefined) {
    row.errorCode = end.errorCode;
  }
  if (end.output !== undefined) {
    row.output = end.output;
  }
  return row;
}
