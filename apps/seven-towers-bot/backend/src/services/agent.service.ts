import { MAX_ANSWER_TOKENS, MAX_TOOL_ROUNDS } from '../config/limits';
import type { ProjectKnowledge } from './knowledge.service';
import { buildMessages, type ChatHistoryMessage } from './prompt.service';
import { GAP_UNKNOWN_FALLBACK } from './report-gap.tool';
import { chatTools, executeTool, type Attachment } from './tools.service';
import type {
  LlmChatMessage,
  LlmClient,
  LlmToolCall,
} from '../types/llm';

export type AgentEmit =
  | { type: 'token'; text: string }
  | { type: 'attachment'; payload: Attachment };

export type AgentResult = {
  text: string;
  attachments: Attachment[];
  usage: { promptTokens: number; completionTokens: number };
  finishReason: 'stop' | 'length' | 'aborted' | 'error';
  ttftMs: number | null;
  latencyMs: number;
  guardFlags: string[];
  /** Validated report_gap needs from this turn (for async persistence). */
  reportedGaps: string[];
};

type AccumToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export async function runChat(options: {
  llm: LlmClient;
  project: ProjectKnowledge;
  history: ChatHistoryMessage[];
  userMessage: string;
  signal: AbortSignal;
  emit: (event: AgentEmit) => void;
}): Promise<AgentResult> {
  const started = Date.now();
  let ttftMs: number | null = null;
  let text = '';
  const attachments: Attachment[] = [];
  const reportedGaps: string[] = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let finishReason: AgentResult['finishReason'] = 'stop';

  const seed = await buildMessages(
    options.project,
    options.history,
    options.userMessage,
  );
  const messages: LlmChatMessage[] = seed.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const maxRounds = MAX_TOOL_ROUNDS + 1;

  for (let round = 0; round < maxRounds; round++) {
    if (options.signal.aborted) {
      finishReason = 'aborted';
      break;
    }

    const pending = new Map<number, AccumToolCall>();
    let roundText = '';
    let roundFinish: string | undefined;

    try {
      for await (const chunk of options.llm.streamChat({
        messages,
        tools: chatTools,
        maxTokens: MAX_ANSWER_TOKENS,
        signal: options.signal,
      })) {
        if (chunk.type === 'token') {
          if (ttftMs === null) {
            ttftMs = Date.now() - started;
          }
          roundText += chunk.text;
          text += chunk.text;
          options.emit({ type: 'token', text: chunk.text });
        } else if (chunk.type === 'tool_call_delta') {
          const existing = pending.get(chunk.index) ?? {
            id: '',
            name: '',
            arguments: '',
          };
          if (chunk.id) {
            existing.id = chunk.id;
          }
          if (chunk.name) {
            existing.name = chunk.name;
          }
          if (chunk.argumentsDelta) {
            existing.arguments += chunk.argumentsDelta;
          }
          pending.set(chunk.index, existing);
        } else if (chunk.type === 'finish') {
          roundFinish = chunk.reason;
          if (chunk.usage) {
            promptTokens += chunk.usage.promptTokens;
            completionTokens += chunk.usage.completionTokens;
          }
        }
      }
    } catch (err) {
      if (options.signal.aborted) {
        finishReason = 'aborted';
        break;
      }
      throw err;
    }

    if (pending.size > 0) {
      const toolCalls: LlmToolCall[] = [...pending.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, tc]) => ({
          id: tc.id || `call_${round}_${tc.name}`,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments || '{}' },
        }));

      messages.push({
        role: 'assistant',
        content: roundText.length > 0 ? roundText : null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const result = executeTool(
          options.project,
          tc.function.name,
          tc.function.arguments,
        );
        if (result.attachment) {
          attachments.push(result.attachment);
          options.emit({ type: 'attachment', payload: result.attachment });
        }
        if (result.gapNeed) {
          reportedGaps.push(result.gapNeed);
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result.toolResultText,
        });
      }

      // report_gap alone is terminal: do not call the LLM again.
      const onlyGaps = toolCalls.every((tc) => tc.function.name === 'report_gap');
      if (onlyGaps) {
        if (text.trim().length === 0) {
          text = GAP_UNKNOWN_FALLBACK;
          options.emit({ type: 'token', text: GAP_UNKNOWN_FALLBACK });
        }
        finishReason = 'stop';
        break;
      }

      // Cap: if this was the last allowed tool round, stop without another call.
      if (round >= MAX_TOOL_ROUNDS) {
        finishReason = 'stop';
        break;
      }
      continue;
    }

    if (roundFinish === 'length') {
      finishReason = 'length';
    } else {
      finishReason = 'stop';
    }
    break;
  }

  return {
    text,
    attachments,
    usage: { promptTokens, completionTokens },
    finishReason,
    ttftMs,
    latencyMs: Date.now() - started,
    guardFlags: [],
    reportedGaps,
  };
}
