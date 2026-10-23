import {
  imagesShownMarker,
  stripAttachmentMarkers,
} from '../guardrails/attachment-markers';
import { loadGapReportingPrompt } from '../lib/gap-reporting-prompt';
import type { ProjectKnowledge } from './knowledge.service';
import { buildSystemPromptText } from './knowledge-validate';

export type ChatHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
  attachments?: unknown[];
};

export type LlmMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string };

const promptCache = new Map<string, string>();

/** Static system prompt only (no dates / user data) so vLLM prefix caching works. */
export async function buildSystemPrompt(project: ProjectKnowledge): Promise<string> {
  const cached = promptCache.get(project.projectId);
  if (cached) {
    return cached;
  }

  const gapReportingMd = await loadGapReportingPrompt();
  const built = buildSystemPromptText(
    project.systemMd,
    project.knowledgeMd,
    gapReportingMd,
  );
  promptCache.set(project.projectId, built);
  return built;
}

export function clearPromptCache(): void {
  promptCache.clear();
}

function imageIdsFromAttachments(attachments: unknown[]): string[] {
  const images: string[] = [];
  for (const raw of attachments) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const att = raw as { type?: string; items?: { id: string }[] };
    if (att.type === 'images' && Array.isArray(att.items)) {
      for (const item of att.items) {
        images.push(item.id);
      }
    }
  }
  return images;
}

export async function buildMessages(
  project: ProjectKnowledge,
  history: ChatHistoryMessage[],
  userMessage: string,
): Promise<LlmMessage[]> {
  const system = await buildSystemPrompt(project);
  const messages: LlmMessage[] = [{ role: 'system', content: system }];

  for (const msg of history) {
    // Drop any markers the model previously echoed into stored content.
    let content = stripAttachmentMarkers(msg.content);
    if (
      msg.role === 'assistant' &&
      Array.isArray(msg.attachments) &&
      msg.attachments.length > 0
    ) {
      content += imagesShownMarker(imageIdsFromAttachments(msg.attachments));
    }
    messages.push({ role: msg.role, content });
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}
