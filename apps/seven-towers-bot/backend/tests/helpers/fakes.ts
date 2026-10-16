import { AppError, ErrorCodes } from '../../src/lib/errors';
import type { KnowledgeStore, ProjectKnowledge } from '../../src/services/knowledge.service';
import type { LlmClient, LlmStreamChunk, StreamChatParams } from '../../src/types/llm';

export function createFakeKnowledge(
  overrides?: Partial<ProjectKnowledge>,
): KnowledgeStore {
  const project: ProjectKnowledge = {
    projectId: 'seven-towers',
    systemMd: 'You are a helpful assistant.',
    knowledgeMd:
      'Last updated: 2026-01-15\n\n# Doc\n\nDoc body\n\n![Sample floor plan](images/sample-floor-plan.webp)\n',
    lastUpdated: '2026-01-15',
    tables: new Map([
      [
        'sample-payment-plan',
        {
          id: 'sample-payment-plan',
          title: 'Sample payment plan',
          columns: [
            { key: '0', label: 'Milestone', align: 'left' as const },
            { key: '1', label: '%', align: 'right' as const },
          ],
          rows: [{ '0': 'Booking', '1': '10' }],
        },
      ],
    ]),
    images: new Map([
      [
        'sample-floor-plan',
        {
          alt: 'Sample floor plan',
          url: '/api/assets/seven-towers/images/sample-floor-plan',
          thumbUrl: '/api/assets/seven-towers/images/sample-floor-plan?thumb=1',
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
      void _params;
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
      void _params;
      calls += 1;
      if (calls === 1) {
        yield {
          type: 'tool_call_delta',
          index: 0,
          id: 'call_1',
          name: 'show_images',
          argumentsDelta: '{"files":["sample-floor-plan"]}',
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
