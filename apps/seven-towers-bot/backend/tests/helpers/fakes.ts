import { AppError, ErrorCodes } from '../../src/lib/errors';
import type { KnowledgeStore, ProjectKnowledge } from '../../src/services/knowledge.service';
import type { LlmClient, LlmStreamChunk, StreamChatParams } from '../../src/types/llm';

export function createFakeKnowledge(
  overrides?: Partial<ProjectKnowledge>,
): KnowledgeStore {
  const project: ProjectKnowledge = {
    projectId: 'seven-towers',
    document: 'Doc body',
    prices: {
      updatedAt: '2026-01-15',
      currency: 'PKR',
      items: [{ id: '1bed', label: '1-bed', price: 1 }],
    },
    catalog: [
      {
        id: 'sample-floor-plan',
        type: 'image',
        title: 'Sample floor plan',
        tags: ['floor-plan'],
        file: 'sample-floor-plan',
      },
      {
        id: 'sample-payment-plan',
        type: 'table',
        title: 'Sample payment plan',
        tags: ['payment'],
        file: 'sample-payment-plan.json',
      },
    ],
    tables: new Map([
      [
        'sample-payment-plan',
        {
          title: 'Sample payment plan',
          columns: [
            { key: 'milestone', label: 'Milestone' },
            { key: 'percent', label: '%' },
          ],
          rows: [{ milestone: 'Booking', percent: 10 }],
        },
      ],
    ]),
    rootDir: `${process.cwd()}/knowledge/seven-towers`,
    ...overrides,
  };

  return {
    async loadAll() {},
    async reload() {
      return [project.projectId];
    },
    getProject(id: string) {
      if (id !== project.projectId) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, `Unknown project: ${id}`);
      }
      return project;
    },
    listProjectIds() {
      return [project.projectId];
    },
  };
}

/** Fake LLM that streams a plain text answer. */
export function createPlainLlm(text = 'Hello from the bot.'): LlmClient {
  return {
    async ping() {},
    async *streamChat(_params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
      yield { type: 'token', text };
      yield {
        type: 'finish',
        reason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5 },
      };
    },
  };
}

/** Fake LLM that does one tool round then answers. */
export function createToolLlm(): LlmClient {
  let calls = 0;
  return {
    async ping() {},
    async *streamChat(_params: StreamChatParams): AsyncIterable<LlmStreamChunk> {
      calls += 1;
      if (calls === 1) {
        yield {
          type: 'tool_call_delta',
          index: 0,
          id: 'call_1',
          name: 'show_images',
          argumentsDelta: '{"ids":["sample-floor-plan"]}',
        };
        yield { type: 'finish', reason: 'tool_calls' };
        return;
      }
      yield { type: 'token', text: 'Here is the floor plan.' };
      yield {
        type: 'finish',
        reason: 'stop',
        usage: { promptTokens: 20, completionTokens: 8 },
      };
    },
  };
}
