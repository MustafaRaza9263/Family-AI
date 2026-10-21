import { describe, expect, it } from 'vitest';
import { MAX_TOOL_ROUNDS } from '../../src/config/limits';
import { runChat } from '../../src/services/agent.service';
import type { LlmClient, LlmStreamChunk, StreamChatParams } from '../../src/types/llm';
import { createFakeKnowledge, createPlainLlm, createToolLlm } from '../helpers/fakes';

describe('agent.service', () => {
  const project = createFakeKnowledge().getProject('seven-towers');

  it('streams a plain answer', async () => {
    const tokens: string[] = [];
    const result = await runChat({
      llm: createPlainLlm('Hi'),
      project,
      history: [],
      userMessage: 'hello',
      signal: new AbortController().signal,
      emit: (e) => {
        if (e.type === 'token') {
          tokens.push(e.text);
        }
      },
    });
    expect(tokens.join('')).toBe('Hi');
    expect(result.finishReason).toBe('stop');
  });

  it('handles one tool round and emits attachment', async () => {
    const attachments: unknown[] = [];
    const result = await runChat({
      llm: createToolLlm(),
      project,
      history: [],
      userMessage: 'show floor plan',
      signal: new AbortController().signal,
      emit: (e) => {
        if (e.type === 'attachment') {
          attachments.push(e.payload);
        }
      },
    });
    expect(attachments).toHaveLength(1);
    expect(result.text).toContain('floor plan');
  });

  it('caps tool rounds', async () => {
    let calls = 0;
    const llm: LlmClient = {
      async ping() {},
      async *streamChat(_params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
        calls += 1;
        yield {
          type: 'tool_call_delta',
          index: 0,
          id: `call_${calls}`,
          name: 'show_images',
          argumentsDelta: '{"files":["location"]}',
        };
        yield { type: 'finish', reason: 'tool_calls' };
      },
    };

    await runChat({
      llm,
      project,
      history: [],
      userMessage: 'tables',
      signal: new AbortController().signal,
      emit: () => {},
    });

    expect(calls).toBe(MAX_TOOL_ROUNDS + 1);
  });

  it('stops on abort', async () => {
    const abort = new AbortController();
    const llm: LlmClient = {
      async ping() {},
      async *streamChat(params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
        abort.abort();
        if (params.signal.aborted) {
          throw new Error('aborted');
        }
        yield { type: 'token', text: 'x' };
        yield { type: 'finish', reason: 'stop' };
      },
    };

    const result = await runChat({
      llm,
      project,
      history: [],
      userMessage: 'hi',
      signal: abort.signal,
      emit: () => {},
    });
    expect(result.finishReason).toBe('aborted');
  });
});
