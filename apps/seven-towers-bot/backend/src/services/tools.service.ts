import { z } from 'zod';
import { closestNames } from '../lib/edit-distance';
import type { LlmToolDefinition } from '../types/llm';
import type { ProjectKnowledge } from './knowledge.service';

const showImagesArgsSchema = z.object({
  files: z.array(z.string()).min(1).max(6),
  caption: z.string().max(200).optional(),
});

export type ImageAttachment = {
  type: 'images';
  caption?: string;
  items: { id: string; title: string; url: string; thumbUrl: string }[];
};

/** Attachments the UI can render. Tables are markdown in the answer, not tools. */
export type Attachment = ImageAttachment;

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
        'Show one or more knowledge-base images (floor plans, photos) by file name as written in the knowledge base (no images/ prefix, no .webp suffix).',
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 6,
          },
          caption: { type: 'string', maxLength: 200 },
        },
        required: ['files'],
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

  const validNames = [...project.images.keys()];
  const invalid: string[] = [];
  const items: ImageAttachment['items'] = [];

  for (const file of args.data.files) {
    const image = project.images.get(file);
    if (!image) {
      invalid.push(file);
      continue;
    }
    items.push({
      id: file,
      title: image.alt,
      url: image.url,
      thumbUrl: image.thumbUrl,
    });
  }

  const parts: string[] = [];
  if (items.length > 0) {
    parts.push(`Shown images: ${items.map((i) => i.id).join(', ')}`);
  }
  if (invalid.length > 0) {
    const suggestions = invalid
      .map((name) => {
        const near = closestNames(name, validNames, 3);
        return near.length > 0
          ? `"${name}" (closest: ${near.join(', ')})`
          : `"${name}"`;
      })
      .join('; ');
    parts.push(`Unknown image names dropped: ${suggestions}`);
  }

  return {
    attachment:
      items.length > 0
        ? { type: 'images', caption: args.data.caption, items }
        : null,
    toolResultText: parts.join('. ') || 'No images shown.',
  };
}
