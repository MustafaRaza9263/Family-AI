import { promises as fs } from 'fs';
import path from 'path';
import type { ProjectKnowledge } from './knowledge.service';

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

function projectRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

export async function loadSystemMarkdown(): Promise<string> {
  return fs.readFile(path.join(projectRoot(), 'prompts', 'system.md'), 'utf8');
}

/** Static system prompt only (no dates / user data) so vLLM prefix caching works. */
export async function buildSystemPrompt(project: ProjectKnowledge): Promise<string> {
  const cached = promptCache.get(project.projectId);
  if (cached) {
    return cached;
  }

  const systemMd = await loadSystemMarkdown();
  const parts: string[] = [];

  parts.push(systemMd.trim());
  parts.push('DOCUMENT');
  parts.push(project.document.trim());
  parts.push(`PRICES (last updated: ${project.prices.updatedAt})`);
  parts.push(JSON.stringify(project.prices, null, 2));
  parts.push('TABLES');

  for (const entry of project.catalog.filter((c) => c.type === 'table')) {
    const table = project.tables.get(entry.id);
    if (!table) {
      continue;
    }
    const header = table.columns.map((c) => c.key).join(' | ');
    const rows = table.rows
      .map((row) => table.columns.map((c) => String(row[c.key] ?? '')).join(' | '))
      .join('\n');
    parts.push(`[${entry.id}] ${table.title}\n${header}\n${rows}`);
  }

  parts.push('CATALOG');
  for (const entry of project.catalog) {
    parts.push(
      `${entry.id} | ${entry.type} | ${entry.title} | ${entry.tags.join(',')}`,
    );
  }

  const built = parts.join('\n\n');
  promptCache.set(project.projectId, built);
  return built;
}

export function clearPromptCache(): void {
  promptCache.clear();
}

function attachmentMarker(attachments: unknown[]): string {
  const images: string[] = [];
  const tables: string[] = [];
  for (const raw of attachments) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const att = raw as { type?: string; id?: string; items?: { id: string }[] };
    if (att.type === 'images' && Array.isArray(att.items)) {
      for (const item of att.items) {
        images.push(item.id);
      }
    } else if (att.type === 'table' && typeof att.id === 'string') {
      tables.push(att.id);
    }
  }
  const bits: string[] = [];
  if (images.length > 0) {
    bits.push(`image(s) ${images.join(', ')}`);
  }
  if (tables.length > 0) {
    bits.push(`table ${tables.join(', ')}`);
  }
  if (bits.length === 0) {
    return '';
  }
  return `\n[Shown to the user: ${bits.join('; ')}]`;
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
