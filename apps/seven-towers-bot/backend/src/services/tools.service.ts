import { z } from 'zod';
import type { ProjectKnowledge } from './knowledge.service';
import type { LlmToolDefinition } from '../types/llm';

const showImagesArgsSchema = z.object({
  ids: z.array(z.string()).min(1).max(6),
  caption: z.string().max(200).optional(),
});

const showTableArgsSchema = z.object({
  id: z.string().min(1),
});

export type ImageAttachment = {
  type: 'images';
  caption?: string;
  items: { id: string; title: string; url: string; thumbUrl: string }[];
};

export type TableAttachment = {
  type: 'table';
  id: string;
  title: string;
  columns: { key: string; label: string; align?: string }[];
  rows: Record<string, unknown>[];
  notes?: string;
};

export type Attachment = ImageAttachment | TableAttachment;

export type ToolExecution = {
  attachment: Attachment | null;
  toolResultText: string;
};

export const chatTools: LlmToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'show_images',
      description:
        'Show one or more catalog images (floor plans, photos) to the user by id.',
      parameters: {
        type: 'object',
        properties: {
          ids: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 6,
          },
          caption: { type: 'string', maxLength: 200 },
        },
        required: ['ids'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_table',
      description:
        'Show one catalog table (payment plan, room breakdown) to the user by id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
];

export function executeTool(
  project: ProjectKnowledge,
  name: string,
  rawArgs: string,
): ToolExecution {
  if (name === 'show_images') {
    return executeShowImages(project, rawArgs);
  }
  if (name === 'show_table') {
    return executeShowTable(project, rawArgs);
  }
  return {
    attachment: null,
    toolResultText: `Unknown tool "${name}".`,
  };
}

function executeShowImages(project: ProjectKnowledge, rawArgs: string): ToolExecution {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArgs);
  } catch {
    return { attachment: null, toolResultText: 'Invalid JSON arguments for show_images.' };
  }

  const args = showImagesArgsSchema.safeParse(parsed);
  if (!args.success) {
    return { attachment: null, toolResultText: 'Invalid show_images arguments.' };
  }

  const invalid: string[] = [];
  const items: ImageAttachment['items'] = [];

  for (const id of args.data.ids) {
    const entry = project.catalog.find((c) => c.id === id);
    if (!entry || entry.type !== 'image') {
      invalid.push(id);
      continue;
    }
    const url = `/api/assets/${project.projectId}/images/${entry.file}`;
    items.push({
      id: entry.id,
      title: entry.title,
      url,
      thumbUrl: `${url}?thumb=1`,
    });
  }

  const parts: string[] = [];
  if (items.length > 0) {
    parts.push(`Shown images: ${items.map((i) => i.id).join(', ')}`);
  }
  if (invalid.length > 0) {
    parts.push(`Invalid or unknown image ids dropped: ${invalid.join(', ')}`);
  }

  return {
    attachment:
      items.length > 0
        ? { type: 'images', caption: args.data.caption, items }
        : null,
    toolResultText: parts.join('. ') || 'No images shown.',
  };
}

function executeShowTable(project: ProjectKnowledge, rawArgs: string): ToolExecution {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArgs);
  } catch {
    return { attachment: null, toolResultText: 'Invalid JSON arguments for show_table.' };
  }

  const args = showTableArgsSchema.safeParse(parsed);
  if (!args.success) {
    return { attachment: null, toolResultText: 'Invalid show_table arguments.' };
  }

  const entry = project.catalog.find((c) => c.id === args.data.id);
  if (!entry || entry.type !== 'table') {
    return {
      attachment: null,
      toolResultText: `Invalid or unknown table id: ${args.data.id}`,
    };
  }

  const table = project.tables.get(entry.id);
  if (!table) {
    return {
      attachment: null,
      toolResultText: `Table data missing for id: ${entry.id}`,
    };
  }

  const attachment: TableAttachment = {
    type: 'table',
    id: entry.id,
    title: table.title,
    columns: table.columns,
    rows: table.rows,
    notes: table.notes,
  };

  return {
    attachment,
    toolResultText: `Shown table: ${entry.id}`,
  };
}
