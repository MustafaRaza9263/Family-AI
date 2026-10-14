import { describe, expect, it } from 'vitest';
import { openSse } from '../../src/lib/sse';
import {
  buildMessages,
  buildSystemPrompt,
  clearPromptCache,
} from '../../src/services/prompt.service';
import { executeTool } from '../../src/services/tools.service';
import { createFakeKnowledge } from '../helpers/fakes';
import type { Response } from 'express';

describe('tools.service', () => {
  const project = createFakeKnowledge().getProject('seven-towers');

  it('drops unknown image ids', () => {
    const result = executeTool(
      project,
      'show_images',
      JSON.stringify({ ids: ['sample-floor-plan', 'nope'] }),
    );
    expect(result.attachment?.type).toBe('images');
    if (result.attachment?.type === 'images') {
      expect(result.attachment.items).toHaveLength(1);
    }
    expect(result.toolResultText).toMatch(/Invalid/);
  });

  it('rejects wrong type for show_table', () => {
    const result = executeTool(
      project,
      'show_table',
      JSON.stringify({ id: 'sample-floor-plan' }),
    );
    expect(result.attachment).toBeNull();
  });
});

describe('prompt.service', () => {
  it('builds sections in order', async () => {
    clearPromptCache();
    const project = createFakeKnowledge().getProject('seven-towers');
    const prompt = await buildSystemPrompt(project);
    // Match section headers as whole lines so body text mentioning TABLES does not confuse order.
    const doc = prompt.search(/\nDOCUMENT\n/);
    const prices = prompt.search(/\nPRICES \(last updated:/);
    const tables = prompt.search(/\nTABLES\n/);
    const catalog = prompt.search(/\nCATALOG\n/);
    expect(doc).toBeGreaterThan(-1);
    expect(prices).toBeGreaterThan(doc);
    expect(tables).toBeGreaterThan(prices);
    expect(catalog).toBeGreaterThan(tables);
  });

  it('appends history attachment marker', async () => {
    const project = createFakeKnowledge().getProject('seven-towers');
    const messages = await buildMessages(
      project,
      [
        {
          role: 'assistant',
          content: 'See this',
          attachments: [
            {
              type: 'images',
              items: [{ id: 'sample-floor-plan' }],
            },
          ],
        },
      ],
      'thanks',
    );
    const assistant = messages.find((m) => m.role === 'assistant');
    expect(assistant?.content).toContain('[Shown to the user: image(s) sample-floor-plan]');
  });
});

describe('sse', () => {
  it('frames events correctly', () => {
    const chunks: string[] = [];
    const res = {
      status() {
        return this;
      },
      setHeader() {},
      flushHeaders() {},
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
      end() {},
      on() {
        return this;
      },
      writableEnded: false,
    } as unknown as Response;

    const sse = openSse(res);
    sse.send('token', { text: 'hi' });
    expect(chunks.some((c) => c === 'event: token\ndata: {"text":"hi"}\n\n')).toBe(
      true,
    );
    sse.close();
  });
});
