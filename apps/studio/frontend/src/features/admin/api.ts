import {
  adminJobDetailResponseSchema,
  adminJobsQuerySchema,
  adminJobsResponseSchema,
  adminStatsSchema,
  adminUpdateUserRequestSchema,
  adminUpdateUserResponseSchema,
  adminUserListQuerySchema,
  adminUserListResponseSchema,
  engineSchema,
  patchEngineRequestSchema,
  type AdminJobsQuery,
  type AdminStatsRange,
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

export function getAdminStats(range: AdminStatsRange) {
  return apiFetch(`/api/admin/stats?range=${range}`, adminStatsSchema);
}

export function listAdminJobs(query: AdminJobsQuery) {
  const parsed = adminJobsQuerySchema.parse(query);
  const p = new URLSearchParams();
  if (parsed.status) p.set('status', parsed.status);
  if (parsed.tool) p.set('tool', parsed.tool);
  if (parsed.recipe) p.set('recipe', parsed.recipe);
  if (parsed.user) p.set('user', parsed.user);
  if (parsed.q) p.set('q', parsed.q);
  if (parsed.from) p.set('from', parsed.from);
  if (parsed.to) p.set('to', parsed.to);
  if (parsed.cursor) p.set('cursor', parsed.cursor);
  p.set('limit', String(parsed.limit));
  return apiFetch(`/api/admin/jobs?${p.toString()}`, adminJobsResponseSchema);
}

/** Full job detail including telemetry and optional live snapshot. */
export function getAdminJob(id: string) {
  return apiFetch(
    `/api/admin/jobs/${encodeURIComponent(id)}`,
    adminJobDetailResponseSchema,
  );
}
