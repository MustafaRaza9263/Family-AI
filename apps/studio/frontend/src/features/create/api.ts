import {
  assetSchema,
  capabilitiesResponseSchema,
  createThreadRequestSchema,
  createThreadResponseSchema,
  generationResponseSchema,
  libraryPageSchema,
  threadDetailResponseSchema,
  threadListResponseSchema,
  type CreateGenerationRequest,
} from '@studio/shared';
import { z } from 'zod';
import { apiFetch } from '@/lib/api-client';

export function fetchCapabilities() {
  return apiFetch('/api/capabilities', capabilitiesResponseSchema);
}

export function listThreads() {
  return apiFetch('/api/threads', threadListResponseSchema);
}

export function getThread(id: string) {
  return apiFetch(`/api/threads/${id}`, threadDetailResponseSchema);
}

export function createThread(title?: string) {
  const body = createThreadRequestSchema.parse(title ? { title } : {});
  return apiFetch('/api/threads', createThreadResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createGeneration(threadId: string, input: CreateGenerationRequest) {
  return apiFetch(
    `/api/threads/${threadId}/generations`,
    generationResponseSchema,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function cancelGeneration(jobId: string) {
  return apiFetch(`/api/generations/${jobId}`, z.unknown(), {
    method: 'DELETE',
  });
}

export function deleteAsset(assetId: string) {
  return apiFetch(`/api/assets/${assetId}`, z.unknown(), { method: 'DELETE' });
}

const uploadResponseSchema = z.object({ asset: assetSchema });

export async function uploadImage(file: File) {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/uploads', {
    method: 'POST',
    body,
    credentials: 'include',
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code =
      json &&
      typeof json === 'object' &&
      'error' in json &&
      json.error &&
      typeof json.error === 'object' &&
      'code' in json.error &&
      typeof json.error.code === 'string'
        ? json.error.code
        : 'UPLOAD_INVALID';
    throw Object.assign(new Error(code), { code });
  }
  return uploadResponseSchema.parse(json).asset;
}

export function listLibraryForAttach(opts: {
  source?: 'generated' | 'upload';
  limit?: number;
}) {
  const params = new URLSearchParams();
  params.set('kind', 'image');
  if (opts.source) params.set('source', opts.source);
  params.set('limit', String(opts.limit ?? 24));
  return apiFetch(`/api/library?${params}`, libraryPageSchema);
}
