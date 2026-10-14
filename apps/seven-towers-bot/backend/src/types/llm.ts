export type LlmToolCallDelta = {
  type: 'tool_call_delta';
  index: number;
  id?: string;
  name?: string;
  argumentsDelta?: string;
};

export type LlmTokenChunk = { type: 'token'; text: string };

export type LlmFinishChunk = {
  type: 'finish';
  reason: string;
  usage?: { promptTokens: number; completionTokens: number };
};

export type LlmStreamChunk = LlmTokenChunk | LlmToolCallDelta | LlmFinishChunk;

export type LlmToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type LlmChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: LlmToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export type LlmToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type StreamChatParams = {
  messages: LlmChatMessage[];
  tools: LlmToolDefinition[];
  maxTokens: number;
  signal: AbortSignal;
};

export interface LlmClient {
  streamChat(params: StreamChatParams): AsyncIterable<LlmStreamChunk>;
  ping(): Promise<void>;
}
