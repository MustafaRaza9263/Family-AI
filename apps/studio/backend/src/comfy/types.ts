import type { ApiGraph } from './recipes/graph-schema.js';

export type ComfyImageRef = {
  filename: string;
  subfolder: string;
  type: string;
};

export type ComfyHistoryEntry = {
  outputs?: Record<
    string,
    {
      images?: ComfyImageRef[];
    }
  >;
  status?: {
    completed?: boolean;
    status_str?: string;
  };
};

export type ComfyHttp = {
  /** `promptId` is chosen by the caller so the WebSocket can subscribe first. */
  submit(graph: ApiGraph, clientId: string, promptId: string): Promise<string>;
  history(promptId: string): Promise<ComfyHistoryEntry | null>;
  view(ref: ComfyImageRef): Promise<Buffer>;
  interrupt(): Promise<void>;
  queue(): Promise<unknown>;
  ping(): Promise<void>;
};

export type CachedNodeInfo = {
  nodeId: string;
  nodeClass: string;
  nodeTitle?: string;
};

export type ComfyWsEvent =
  | { type: 'status' }
  | { type: 'execution_start'; promptId: string }
  | { type: 'execution_cached'; promptId: string; nodes: string[] }
  | {
      type: 'executing';
      promptId: string;
      node: string | null;
      displayNode?: string;
    }
  | {
      type: 'progress';
      promptId: string;
      value: number;
      max: number;
      node: string;
    }
  | { type: 'executed'; promptId: string; node: string; output: unknown }
  | { type: 'execution_success'; promptId: string }
  | { type: 'execution_error'; promptId: string; detail: unknown }
  | { type: 'execution_interrupted'; promptId: string };

export type ComfyEventHandler = (event: ComfyWsEvent) => void;

export type ComfyEvents = {
  subscribe(promptId: string, handler: ComfyEventHandler): () => void;
  isConnected(): boolean;
};

export type RunHooks = {
  onSubmitted?(promptId: string): void;
  onCached?(nodes: CachedNodeInfo[]): void;
  onNodeStart?(info: {
    nodeId: string;
    nodeClass: string;
    nodeTitle?: string;
    at: Date;
  }): void;
  onProgress?(info: { nodeId: string; value: number; max: number }): void;
};
