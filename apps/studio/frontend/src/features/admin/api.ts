import {
  adminUpdateUserRequestSchema,
  adminUpdateUserResponseSchema,
  adminUserListQuerySchema,
  adminUserListResponseSchema,
  engineSchema,
  patchEngineRequestSchema,
  type AdminUpdateUserRequest,
  type AdminUserListQuery,
  type PatchEngineRequest,
} from '@studio/shared';
import { apiFetch } from '@/lib/api-client';

export async function listUsers(query: AdminUserListQuery) {
  const parsed = adminUserListQuerySchema.parse(query);
  const params = new URLSearchParams();
  if (parsed.status) params.set('status', parsed.status);
  if (parsed.q) params.set('q', parsed.q);
  params.set('page', String(parsed.page));
  params.set('limit', String(parsed.limit));
  return apiFetch(
    `/api/admin/users?${params.toString()}`,
    adminUserListResponseSchema,
  );
}

export async function updateUserStatus(
  id: string,
  body: AdminUpdateUserRequest,
) {
  const parsed = adminUpdateUserRequestSchema.parse(body);
  return apiFetch(
    `/api/admin/users/${encodeURIComponent(id)}`,
    adminUpdateUserResponseSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(parsed),
    },
  );
}

export function getEngine() {
  return apiFetch('/api/admin/engine', engineSchema);
}

export function patchEngine(body: PatchEngineRequest) {
  const parsed = patchEngineRequestSchema.parse(body);
  return apiFetch('/api/admin/engine', engineSchema, {
    method: 'PATCH',
    body: JSON.stringify(parsed),
  });
}
