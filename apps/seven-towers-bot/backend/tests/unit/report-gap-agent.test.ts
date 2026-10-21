import { describe, expect, it } from 'vitest';
import { runChat } from '../../src/services/agent.service';
import { GAP_UNKNOWN_FALLBACK } from '../../src/services/report-gap.tool';
import type { LlmClient, LlmStreamChunk, StreamChatParams } from '../../src/types/llm';
import { createFakeKnowledge } from '../helpers/fakes';

function createGapOnlyLlm(need = 'Parking: spaces in Tower B'): LlmClient {
  let calls = 0;
  return {
    async ping() {},
    async *streamChat(_params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
      void _params;
      calls += 1;
      if (calls > 1) {
        throw new Error('Unexpected second LLM call after sole report_gap');
      }
      yield {
        type: 'tool_call_delta',
        index: 0,
        id: 'call_gap',
        name: 'report_gap',
        argumentsDelta: JSON.stringify({ need }),
      };
      yield { type: 'finish', reason: 'tool_calls' };
    },
  };
}

function createGapWithImagesLlm(): { llm: LlmClient; calls: () => number } {
  let calls = 0;
  const llm: LlmClient = {
    async ping() {},
    async *streamChat(_params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
      void _params;
      calls += 1;
      if (calls === 1) {
        yield {
          type: 'tool_call_delta',
          index: 0,
          id: 'call_img',
          name: 'show_images',
          argumentsDelta: '{"files":["location"]}',
        };
        yield {
          type: 'tool_call_delta',
          index: 1,
          id: 'call_gap',
          name: 'report_gap',
          argumentsDelta: '{"need":"Amenities: gym opening hours"}',
        };
        yield { type: 'finish', reason: 'tool_calls' };
        return;
      }
      yield { type: 'token', text: 'Here is the map; gym hours are not listed.' };
      yield {
        type: 'finish',
        reason: 'stop',
        usage: { promptTokens: 20, completionTokens: 8 },
      };
    },
  };
  return { llm, calls: () => calls };
}

describe('report_gap agent behaviour', () => {
  const project = createFakeKnowledge().getProject('seven-towers');

  it('ends the turn without a second LLM call and emits fallback text', async () => {
    const tokens: string[] = [];
    const result = await runChat({
      llm: createGapOnlyLlm(),
      project,
      history: [],
      userMessage: 'How many parking spaces in Tower B?',
      signal: new AbortController().signal,
      emit: (e) => {
        if (e.type === 'token') {
          tokens.push(e.text);
        }
      },
    });

    expect(tokens.join('')).toBe(GAP_UNKNOWN_FALLBACK);
    expect(result.text).toBe(GAP_UNKNOWN_FALLBACK);
    expect(result.reportedGaps).toEqual(['Parking: spaces in Tower B']);
    expect(result.attachments).toHaveLength(0);
  });

  it('continues normally when report_gap is mixed with show_images', async () => {
    const { llm, calls } = createGapWithImagesLlm();
    const attachments: unknown[] = [];
    const result = await runChat({
      llm,
      project,
      history: [],
      userMessage: 'Show the map and gym hours',
      signal: new AbortController().signal,
      emit: (e) => {
        if (e.type === 'attachment') {
          attachments.push(e.payload);
        }
      },
    });

    expect(calls()).toBe(2);
    expect(attachments).toHaveLength(1);
    expect(result.reportedGaps).toEqual(['Amenities: gym opening hours']);
    expect(result.text).toContain('map');
  });

  it('keeps streamed text when sole report_gap already answered', async () => {
    let calls = 0;
    const llm: LlmClient = {
      async ping() {},
      async *streamChat(_params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
        void _params;
        calls += 1;
        if (calls > 1) {
          throw new Error('Unexpected second LLM call');
        }
        yield {
          type: 'token',
          text: 'I have the location but not the parking count.',
        };
        yield {
          type: 'tool_call_delta',
          index: 0,
          id: 'call_gap',
          name: 'report_gap',
          argumentsDelta: '{"need":"Parking: spaces in Tower B"}',
        };
        yield { type: 'finish', reason: 'tool_calls' };
      },
    };

    const result = await runChat({
      llm,
      project,
      history: [],
      userMessage: 'parking?',
      signal: new AbortController().signal,
      emit: () => {},
    });

    expect(result.text).toBe('I have the location but not the parking count.');
    expect(result.reportedGaps).toHaveLength(1);
  });
});
