import type { Logger } from '../lib/logger.js';
import { EngineError, EngineErrorCodes } from './errors.js';
import { resolveNodeInfo } from './resolve-node.js';
import type { ApiGraph } from './recipes/graph-schema.js';
import type { ComfyWsEvent, RunHooks } from './types.js';

export type FinishReason =
  | { kind: 'success' }
  | { kind: 'error'; error: EngineError };

export type HandlerContext = {
  graph: ApiGraph;
  hooks: RunHooks;
  logger: Logger;
  finish: (reason: FinishReason) => void;
};

export function handlePromptEvent(
  ctx: HandlerContext,
  event: ComfyWsEvent,
): void {
  switch (event.type) {
    case 'execution_cached': {
      const nodes = event.nodes.map((nodeId) =>
        resolveNodeInfo(ctx.graph, nodeId),
      );
      ctx.hooks.onCached?.(nodes);
      return;
    }
    case 'executing': {
      if (event.node === null) {
        ctx.finish({ kind: 'success' });
        return;
      }
      const info = resolveNodeInfo(ctx.graph, event.node, event.displayNode);
      ctx.hooks.onNodeStart?.({ ...info, at: new Date() });
      return;
    }
    case 'progress': {
      ctx.hooks.onProgress?.({
        nodeId: event.node,
        value: event.value,
        max: event.max,
      });
      return;
    }
    case 'execution_success': {
      ctx.finish({ kind: 'success' });
      return;
    }
    case 'execution_error': {
      ctx.logger.error(
        { detail: event.detail },
        'comfy execution_error',
      );
      ctx.finish({
        kind: 'error',
        error: new EngineError(
          EngineErrorCodes.ENGINE_FAILED,
          'Image generation failed',
        ),
      });
      return;
    }
    case 'execution_interrupted': {
      ctx.finish({
        kind: 'error',
        error: new EngineError(
          EngineErrorCodes.ENGINE_CANCELLED,
          'Image generation was cancelled',
        ),
      });
      return;
    }
    default:
      return;
  }
}
