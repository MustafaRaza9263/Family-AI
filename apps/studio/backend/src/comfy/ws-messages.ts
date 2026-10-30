import { z } from 'zod';
import type { ComfyWsEvent } from './types.js';

const statusMsg = z.object({ type: z.literal('status') }).passthrough();

const executionStartMsg = z.object({
  type: z.literal('execution_start'),
  data: z.object({ prompt_id: z.string() }),
});

const executionCachedMsg = z.object({
  type: z.literal('execution_cached'),
  data: z.object({
    nodes: z.array(z.union([z.string(), z.number()])),
    prompt_id: z.string(),
  }),
});

const executingMsg = z.object({
  type: z.literal('executing'),
  data: z.object({
    node: z.union([z.string(), z.number()]).nullable(),
    prompt_id: z.string(),
    display_node: z.union([z.string(), z.number()]).optional(),
  }),
});

const progressMsg = z.object({
  type: z.literal('progress'),
  data: z.object({
    value: z.number(),
    max: z.number(),
    node: z.union([z.string(), z.number()]),
    prompt_id: z.string(),
  }),
});

const executedMsg = z.object({
  type: z.literal('executed'),
  data: z.object({
    node: z.union([z.string(), z.number()]),
    output: z.unknown(),
    prompt_id: z.string(),
  }),
});

const executionSuccessMsg = z.object({
  type: z.literal('execution_success'),
  data: z.object({ prompt_id: z.string() }).passthrough(),
});

const executionErrorMsg = z.object({
  type: z.literal('execution_error'),
  data: z.object({ prompt_id: z.string() }).passthrough(),
});

const executionInterruptedMsg = z.object({
  type: z.literal('execution_interrupted'),
  data: z.object({ prompt_id: z.string() }).passthrough(),
});

const frameSchema = z.discriminatedUnion('type', [
  statusMsg,
  executionStartMsg,
  executionCachedMsg,
  executingMsg,
  progressMsg,
  executedMsg,
  executionSuccessMsg,
  executionErrorMsg,
  executionInterruptedMsg,
]);

function asId(value: string | number): string {
  return String(value);
}

/** Parse one text WebSocket frame into a typed event, or null if droppable. */
export function parseWsFrame(raw: string): ComfyWsEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  const parsed = frameSchema.safeParse(json);
  if (!parsed.success) return null;

  const msg = parsed.data;
  switch (msg.type) {
    case 'status':
      return { type: 'status' };
    case 'execution_start':
      return { type: 'execution_start', promptId: msg.data.prompt_id };
    case 'execution_cached':
      return {
        type: 'execution_cached',
        promptId: msg.data.prompt_id,
        nodes: msg.data.nodes.map(asId),
      };
    case 'executing':
      return {
        type: 'executing',
        promptId: msg.data.prompt_id,
        node: msg.data.node === null ? null : asId(msg.data.node),
        displayNode:
          msg.data.display_node === undefined
            ? undefined
            : asId(msg.data.display_node),
      };
    case 'progress':
      return {
        type: 'progress',
        promptId: msg.data.prompt_id,
        value: msg.data.value,
        max: msg.data.max,
        node: asId(msg.data.node),
      };
    case 'executed':
      return {
        type: 'executed',
        promptId: msg.data.prompt_id,
        node: asId(msg.data.node),
        output: msg.data.output,
      };
    case 'execution_success':
      return { type: 'execution_success', promptId: msg.data.prompt_id };
    case 'execution_error':
      return {
        type: 'execution_error',
        promptId: msg.data.prompt_id,
        detail: msg.data,
      };
    case 'execution_interrupted':
      return { type: 'execution_interrupted', promptId: msg.data.prompt_id };
  }
}
