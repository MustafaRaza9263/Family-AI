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

  it('drops unknown image names and suggests closest', () => {
    const result = executeTool(
      project,
      'show_images',
      JSON.stringify({ files: ['location', 'locatin'] }),
    );
    expect(result.attachment?.type).toBe('images');
    if (result.attachment?.type === 'images') {
      expect(result.attachment.items).toHaveLength(1);
    }
    expect(result.toolResultText).toMatch(/Unknown image names/);
    expect(result.toolResultText).toMatch(/location/);
  });

  it('rejects unknown tools', () => {
    const result = executeTool(project, 'show_table', JSON.stringify({ id: 'x' }));
    expect(result.attachment).toBeNull();
    expect(result.toolResultText).toMatch(/Unknown tool/);
  });
});

describe('prompt.service', () => {
  it('builds system.md then KNOWLEDGE BASE then raw knowledge.md', async () => {
    clearPromptCache();
    const project = createFakeKnowledge().getProject('seven-towers');
    const prompt = await buildSystemPrompt(project);
    expect(prompt.startsWith(project.systemMd.trim())).toBe(true);
    const kb = prompt.indexOf('\n\n# KNOWLEDGE BASE\n');
    expect(kb).toBeGreaterThan(-1);
    expect(prompt.slice(kb + '\n\n# KNOWLEDGE BASE\n'.length)).toBe(project.knowledgeMd);
    expect(prompt).not.toMatch(/\nCATALOG\n/);
    expect(prompt).not.toMatch(/\nTABLES\n/);
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
              items: [{ id: 'location' }],
            },
          ],
        },
      ],
      'thanks',
    );
    const assistant = messages.find((m) => m.role === 'assistant');
    expect(assistant?.content).toContain('[Shown to the user: image(s) location]');
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
