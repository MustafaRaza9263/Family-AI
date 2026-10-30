import { describe, expect, it, vi } from 'vitest';
import { EngineError, EngineErrorCodes } from '../../src/comfy/errors.js';
import { runComfyPrompt } from '../../src/comfy/run-prompt.js';
import { silentLogger } from '../telemetry/helpers.js';
import { createFakeEvents, createFakeHttp } from './fakes/fake-comfy.js';
import { sampleRecipe } from './helpers/sample-recipe.js';

function doneHistory() {
  return {
    status: { completed: true, status_str: 'success' },
    outputs: {
      '9': {
        images: [{ filename: 'a.png', subfolder: '', type: 'output' }],
      },
    },
  };
}

function submittedPromptId(
  http: ReturnType<typeof createFakeHttp>,
): string {
  const first = http.submitted[0];
  if (!first) throw new Error('expected a submit');
  return first.promptId;
}

describe('runComfyPrompt', () => {
  it('subscribes before submit and runs the happy path with hook order', async () => {
    const order: string[] = [];
    const http = createFakeHttp({ order });
    const events = createFakeEvents(order);
    const recipe = sampleRecipe();
    const hookOrder: string[] = [];

    const runPromise = runComfyPrompt({
      http,
      events,
      clientId: 'c1',
      recipe,
      graph: recipe.graph,
      timeoutMs: 5_000,
      logger: silentLogger(),
      hooks: {
        onSubmitted: () => hookOrder.push('submitted'),
        onCached: (nodes) => {
          hookOrder.push(`cached:${nodes.map((n) => n.nodeClass).join(',')}`);
        },
        onNodeStart: (n) => {
          hookOrder.push(
            `start:${n.nodeId}:${n.nodeClass}:${n.nodeTitle ?? ''}`,
          );
        },
      },
    });

    await vi.waitFor(() => {
      expect(http.submitted.length).toBe(1);
    });
    expect(order.indexOf('subscribe')).toBeLessThan(order.indexOf('submit'));

    const promptId = submittedPromptId(http);
    http.historyById.set(promptId, doneHistory());

    events.emit(promptId, {
      type: 'execution_cached',
      promptId,
      nodes: ['57:27'],
    });
    events.emit(promptId, {
      type: 'executing',
      promptId,
      node: '57:3',
    });
    events.emit(promptId, { type: 'execution_success', promptId });

    const result = await runPromise;
    expect(result.outputs[0]?.equals(Buffer.from('png'))).toBe(true);
    expect(hookOrder[0]).toBe('submitted');
    expect(hookOrder).toContain('cached:CLIPTextEncode');
    expect(hookOrder).toContain('start:57:3:KSampler:IN_SAMPLER');
  });

  it('maps execution_error to ENGINE_FAILED without leaking detail', async () => {
    const http = createFakeHttp();
    const events = createFakeEvents();
    const recipe = sampleRecipe();
    const runPromise = runComfyPrompt({
      http,
      events,
      clientId: 'c1',
      recipe,
      graph: recipe.graph,
      timeoutMs: 5_000,
      logger: silentLogger(),
    });
    await vi.waitFor(() => expect(http.submitted.length).toBe(1));
    const promptId = submittedPromptId(http);
    events.emit(promptId, {
      type: 'execution_error',
      promptId,
      detail: { exception_message: 'secret stack' },
    });
    await expect(runPromise).rejects.toMatchObject({
      code: EngineErrorCodes.ENGINE_FAILED,
      message: 'Image generation failed',
    });
  });

  it('times out, interrupts, and returns ENGINE_TIMEOUT', async () => {
    const http = createFakeHttp();
    const events = createFakeEvents();
    const recipe = sampleRecipe();
    const runPromise = runComfyPrompt({
      http,
      events,
      clientId: 'c1',
      recipe,
      graph: recipe.graph,
      timeoutMs: 20,
      logger: silentLogger(),
    });
    await expect(runPromise).rejects.toMatchObject({
      code: EngineErrorCodes.ENGINE_TIMEOUT,
    });
    expect(http.interruptCalls).toBeGreaterThan(0);
  });

  it('aborts, interrupts, and returns ENGINE_CANCELLED', async () => {
    const http = createFakeHttp();
    const events = createFakeEvents();
    const recipe = sampleRecipe();
    const ac = new AbortController();
    const runPromise = runComfyPrompt({
      http,
      events,
      clientId: 'c1',
      recipe,
      graph: recipe.graph,
      timeoutMs: 5_000,
      signal: ac.signal,
      logger: silentLogger(),
    });
    await vi.waitFor(() => expect(http.submitted.length).toBe(1));
    ac.abort();
    await expect(runPromise).rejects.toMatchObject({
      code: EngineErrorCodes.ENGINE_CANCELLED,
    });
    expect(http.interruptCalls).toBeGreaterThan(0);
  });

  it('finishes via history poll when the websocket stays silent', async () => {
    vi.useFakeTimers();
    try {
      const http = createFakeHttp();
      const events = createFakeEvents();
      const recipe = sampleRecipe();
      const runPromise = runComfyPrompt({
        http,
        events,
        clientId: 'c1',
        recipe,
        graph: recipe.graph,
        timeoutMs: 60_000,
        logger: silentLogger(),
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(http.submitted.length).toBe(1);
      const promptId = submittedPromptId(http);
      http.historyById.set(promptId, doneHistory());
      await vi.advanceTimersByTimeAsync(5_000);
      const result = await runPromise;
      expect(result.files[0]?.filename).toBe('a.png');
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns ENGINE_BAD_OUTPUT when history has no images', async () => {
    const http = createFakeHttp();
    const events = createFakeEvents();
    const recipe = sampleRecipe();
    const runPromise = runComfyPrompt({
      http,
      events,
      clientId: 'c1',
      recipe,
      graph: recipe.graph,
      timeoutMs: 5_000,
      logger: silentLogger(),
    });
    await vi.waitFor(() => expect(http.submitted.length).toBe(1));
    const promptId = submittedPromptId(http);
    http.historyById.set(promptId, {
      status: { completed: true },
      outputs: { '9': { images: [] } },
    });
    events.emit(promptId, { type: 'execution_success', promptId });
    await expect(runPromise).rejects.toMatchObject({
      code: EngineErrorCodes.ENGINE_BAD_OUTPUT,
    });
  });

  it('surfaces ENGINE_UNAVAILABLE from ping failures at the http layer', async () => {
    const http = createFakeHttp({
      pingError: new EngineError(
        EngineErrorCodes.ENGINE_UNAVAILABLE,
        'Image engine is unavailable',
      ),
    });
    await expect(http.ping()).rejects.toMatchObject({
      code: EngineErrorCodes.ENGINE_UNAVAILABLE,
    });
  });
});
