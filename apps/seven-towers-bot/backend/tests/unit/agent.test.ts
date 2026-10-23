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

  it('nudges and forces show_images when model claims plans without tools', async () => {
    let calls = 0;
    const toolChoices: unknown[] = [];
    const llm: LlmClient = {
      async ping() {},
      async *streamChat(params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
        calls += 1;
        toolChoices.push(params.toolChoice);
        if (calls === 1) {
          yield {
            type: 'token',
            text: 'Here are the floor plans for Nexus Type A.',
          };
          yield { type: 'finish', reason: 'stop' };
          return;
        }
        if (calls === 2) {
          yield {
            type: 'tool_call_delta',
            index: 0,
            id: 'call_nudge',
            name: 'show_images',
            argumentsDelta: '{"files":["location"]}',
          };
          yield { type: 'finish', reason: 'tool_calls' };
          return;
        }
        yield { type: 'token', text: ' Shown above.' };
        yield { type: 'finish', reason: 'stop' };
      },
    };

    const attachments: unknown[] = [];
    const result = await runChat({
      llm,
      project,
      history: [],
      userMessage: 'hello',
      signal: new AbortController().signal,
      emit: (e) => {
        if (e.type === 'attachment') {
          attachments.push(e.payload);
        }
      },
    });

    expect(calls).toBe(3);
    expect(toolChoices[1]).toEqual({
      type: 'function',
      function: { name: 'show_images' },
    });
    expect(attachments).toHaveLength(1);
    expect(result.guardFlags).toContain('image_tool_nudge');
  });

  it('forces show_images tool_choice on explicit floor-plan asks', async () => {
    const toolChoices: unknown[] = [];
    const llm: LlmClient = {
      async ping() {},
      async *streamChat(params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
        toolChoices.push(params.toolChoice);
        yield {
          type: 'tool_call_delta',
          index: 0,
          id: 'call_force',
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
      userMessage: 'show me the floor plans',
      signal: new AbortController().signal,
      emit: () => {},
    });

    expect(toolChoices[0]).toEqual({
      type: 'function',
      function: { name: 'show_images' },
    });
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
