import { describe, expect, it } from 'vitest';
import { parseWsFrame } from '../../src/comfy/ws-messages.js';

describe('parseWsFrame', () => {
  it('parses status', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'status',
          data: { status: { exec_info: { queue_remaining: 0 } } },
        }),
      ),
    ).toEqual({ type: 'status' });
  });

  it('parses execution_start', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'execution_start',
          data: { prompt_id: 'p1' },
        }),
      ),
    ).toEqual({ type: 'execution_start', promptId: 'p1' });
  });

  it('parses execution_cached', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'execution_cached',
          data: { nodes: ['1', 2], prompt_id: 'p1' },
        }),
      ),
    ).toEqual({
      type: 'execution_cached',
      promptId: 'p1',
      nodes: ['1', '2'],
    });
  });

  it('parses executing with a node id', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'executing',
          data: { node: '57:3', prompt_id: 'p1', display_node: '57:3' },
        }),
      ),
    ).toEqual({
      type: 'executing',
      promptId: 'p1',
      node: '57:3',
      displayNode: '57:3',
    });
  });

  it('parses executing with node null', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'executing',
          data: { node: null, prompt_id: 'p1' },
        }),
      ),
    ).toEqual({ type: 'executing', promptId: 'p1', node: null });
  });

  it('parses progress', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'progress',
          data: { value: 2, max: 8, node: '57:3', prompt_id: 'p1' },
        }),
      ),
    ).toEqual({
      type: 'progress',
      promptId: 'p1',
      value: 2,
      max: 8,
      node: '57:3',
    });
  });

  it('parses executed', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'executed',
          data: { node: '9', output: { images: [] }, prompt_id: 'p1' },
        }),
      ),
    ).toEqual({
      type: 'executed',
      promptId: 'p1',
      node: '9',
      output: { images: [] },
    });
  });

  it('parses execution_success', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'execution_success',
          data: { prompt_id: 'p1', timestamp: 1 },
        }),
      ),
    ).toEqual({ type: 'execution_success', promptId: 'p1' });
  });

  it('parses execution_error', () => {
    const ev = parseWsFrame(
      JSON.stringify({
        type: 'execution_error',
        data: { prompt_id: 'p1', exception_message: 'boom' },
      }),
    );
    expect(ev?.type).toBe('execution_error');
    if (ev?.type === 'execution_error') {
      expect(ev.promptId).toBe('p1');
    }
  });

  it('parses execution_interrupted', () => {
    expect(
      parseWsFrame(
        JSON.stringify({
          type: 'execution_interrupted',
          data: { prompt_id: 'p1' },
        }),
      ),
    ).toEqual({ type: 'execution_interrupted', promptId: 'p1' });
  });

  it('drops malformed JSON', () => {
    expect(parseWsFrame('{not-json')).toBeNull();
  });

  it('drops unknown message types', () => {
    expect(parseWsFrame(JSON.stringify({ type: 'preview', data: {} }))).toBeNull();
  });
});
