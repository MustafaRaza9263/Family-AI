import { z } from 'zod';
import { EngineError, EngineErrorCodes } from './errors.js';
import type { Logger } from '../lib/logger.js';
import type { ApiGraph } from './recipes/graph-schema.js';
import type {
  ComfyHistoryEntry,
  ComfyHttp,
  ComfyImageRef,
  ComfyQueueSnapshot,
} from './types.js';

const submitResponseSchema = z.object({
  prompt_id: z.string().min(1),
});

const uploadResponseSchema = z.object({
  name: z.string().min(1),
  subfolder: z.string().optional().default(''),
  type: z.string().optional().default('input'),
});

/** ComfyUI returns [number, promptId, ...] tuples in each queue list. */
const queueResponseSchema = z.object({
  queue_running: z.array(z.array(z.unknown())).default([]),
  queue_pending: z.array(z.array(z.unknown())).default([]),
});

function promptIdsFromTuples(tuples: unknown[][]): string[] {
  const ids: string[] = [];
  for (const tuple of tuples) {
    const id = tuple[1];
    if (typeof id === 'string') ids.push(id);
  }
  return ids;
}

export type CreateComfyHttpOptions = {
  baseUrl: string;
  logger: Logger;
  fetchImpl?: typeof fetch;
};

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function readJson(res: Response): Promise<unknown> {
  return (await res.json()) as unknown;
}

export function createComfyHttp(opts: CreateComfyHttpOptions): ComfyHttp {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const { baseUrl, logger } = opts;

  async function request(
    path: string,
    init?: RequestInit,
  ): Promise<Response> {
    try {
      return await fetchImpl(joinUrl(baseUrl, path), init);
    } catch (err) {
      logger.error({ err }, 'comfy http request failed');
      throw new EngineError(
        EngineErrorCodes.ENGINE_UNAVAILABLE,
        'Image engine is unavailable',
      );
    }
  }

  return {
    async ping(): Promise<void> {
      const res = await request('/system_stats');
      if (!res.ok) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_UNAVAILABLE,
          'Image engine is unavailable',
        );
      }
    },

    async submit(
      graph: ApiGraph,
      clientId: string,
      promptId: string,
    ): Promise<string> {
      const res = await request('/prompt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: graph,
          client_id: clientId,
          prompt_id: promptId,
        }),
      });
      if (!res.ok) {
        logger.error({ status: res.status }, 'comfy submit rejected');
        throw new EngineError(
          EngineErrorCodes.ENGINE_FAILED,
          'Image engine rejected the job',
        );
      }
      const parsed = submitResponseSchema.safeParse(await readJson(res));
      if (!parsed.success) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_FAILED,
          'Image engine returned an invalid response',
        );
      }
      return parsed.data.prompt_id;
    },

    async history(promptId: string): Promise<ComfyHistoryEntry | null> {
      const res = await request(`/history/${encodeURIComponent(promptId)}`);
      if (!res.ok) {
        logger.warn({ status: res.status, promptId }, 'comfy history failed');
        return null;
      }
      const body = (await readJson(res)) as Record<string, ComfyHistoryEntry>;
      return body[promptId] ?? null;
    },

    async view(ref: ComfyImageRef): Promise<Buffer> {
      const qs = new URLSearchParams({
        filename: ref.filename,
        subfolder: ref.subfolder,
        type: ref.type,
      });
      const res = await request(`/view?${qs.toString()}`);
      if (!res.ok) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_BAD_OUTPUT,
          'Image engine output could not be read',
        );
      }
      return Buffer.from(await res.arrayBuffer());
    },

    async interrupt(): Promise<void> {
      await request('/interrupt', { method: 'POST' });
    },

    async queue(): Promise<ComfyQueueSnapshot> {
      const res = await request('/queue');
      if (!res.ok) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_UNAVAILABLE,
          'Image engine is unavailable',
        );
      }
      const parsed = queueResponseSchema.safeParse(await readJson(res));
      if (!parsed.success) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_UNAVAILABLE,
          'Image engine is unavailable',
        );
      }
      return {
        running: promptIdsFromTuples(parsed.data.queue_running),
        pending: promptIdsFromTuples(parsed.data.queue_pending),
      };
    },

    async clearPrompt(promptId: string): Promise<void> {
      await request('/queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ delete: [promptId] }),
      });
    },

    async uploadImage(input): Promise<{
      name: string;
      subfolder: string;
      type: string;
    }> {
      const form = new FormData();
      // Uint8Array body keeps FormData compatible across Node Buffer versions.
      const bytes = new Uint8Array(input.bytes);
      form.append(
        'image',
        new Blob([bytes], { type: 'image/png' }),
        input.filename,
      );
      form.append('type', 'input');
      form.append('overwrite', 'true');
      form.append('subfolder', input.subfolder);

      const res = await request('/upload/image', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        logger.error({ status: res.status }, 'comfy upload rejected');
        throw new EngineError(
          EngineErrorCodes.ENGINE_FAILED,
          'Image engine rejected the upload',
        );
      }
      const parsed = uploadResponseSchema.safeParse(await readJson(res));
      if (!parsed.success) {
        throw new EngineError(
          EngineErrorCodes.ENGINE_FAILED,
          'Image engine returned an invalid upload response',
        );
      }
      const { name, subfolder, type } = parsed.data;
      // LoadImage wants subfolder/name when a subfolder was used.
      const stored =
        subfolder && !name.includes('/') ? `${subfolder}/${name}` : name;
      return { name: stored, subfolder, type };
    },
  };
}
