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

  const built = buildSystemPromptText(project.systemMd, project.knowledgeMd);
  promptCache.set(project.projectId, built);
  return built;
}

export function clearPromptCache(): void {
  promptCache.clear();
}

function attachmentMarker(attachments: unknown[]): string {
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
  if (images.length === 0) {
    return '';
  }
  return `\n[Shown to the user: image(s) ${images.join(', ')}]`;
}

export async function buildMessages(
  project: ProjectKnowledge,
  history: ChatHistoryMessage[],
  userMessage: string,
): Promise<LlmMessage[]> {
  const system = await buildSystemPrompt(project);
  const messages: LlmMessage[] = [{ role: 'system', content: system }];

  for (const msg of history) {
    let content = msg.content;
    if (
      msg.role === 'assistant' &&
      Array.isArray(msg.attachments) &&
      msg.attachments.length > 0
    ) {
      content += attachmentMarker(msg.attachments);
    }
    messages.push({ role: msg.role, content });
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}
