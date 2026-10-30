export type ToolKind = 'image' | 'video';
export type RunStatus = 'done' | 'failed' | 'cancelled';

export type RunMeta = {
  userId: string;
  recipeId: string;
  tool: ToolKind;
  queuedAt: Date;
};

export type RunEvent =
  | {
      type: 'node_start';
      nodeId: string;
      nodeClass: string;
      nodeTitle?: string;
      at: Date;
    }
  | {
      type: 'nodes_cached';
      nodes: { nodeId: string; nodeClass: string; nodeTitle?: string }[];
      at: Date;
    };

export type RunEnd = {
  status: RunStatus;
  errorCode?: string;
  output?: {
    width?: number;
    height?: number;
    frames?: number;
    bytes?: number;
  };
};

export type NodeTiming = {
  nodeId: string;
  class: string;
  title?: string;
  ms: number;
  cached: boolean;
};

export type Phases = {
  loadMs: number;
  sampleMs: number;
  decodeMs: number;
  otherMs: number;
};

export type HardwareSample = {
  at: Date;
  gpuUtilPct: number | null;
  powerW: number | null;
  tempC: number | null;
  memUsedMb: number | null;
  memAvailableMb: number | null;
  swapUsedMb: number | null;
  memTotalMb: number | null;
};

export type HardwareSummary = {
  samples: number;
  gpuUtilAvg: number | null;
  gpuUtilPeak: number | null;
  powerAvgW: number | null;
  powerPeakW: number | null;
  tempPeakC: number | null;
  memUsedAvgMb: number | null;
  memUsedPeakMb: number | null;
  memAvailableMinMb: number | null;
  swapUsedStartMb: number | null;
  swapUsedPeakMb: number | null;
  memTotalMb: number | null;
  gpuAvailable: boolean;
};

export type Telemetry = {
  runStart(jobId: string, meta: RunMeta): void;
  runEvent(jobId: string, ev: RunEvent): void;
  runEnd(jobId: string, end: RunEnd): void;
  flush(): Promise<void>;
};
