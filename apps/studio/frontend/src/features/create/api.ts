import {
  capabilitiesResponseSchema,
  createThreadRequestSchema,
  createThreadResponseSchema,
  generationResponseSchema,
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
