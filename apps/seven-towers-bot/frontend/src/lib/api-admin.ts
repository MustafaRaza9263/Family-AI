import { apiFetch } from "./api";
import type {
  AccountStatus,
  AdminUserDetail,
  AdminUserListItem,
  AuditEntry,
  Conversation,
  KnowledgeGapItem,
  KnowledgeGapStatus,
  Message,
  Role,
  WritableAccountStatus,
} from "./types";

export const adminApi = {
  listUsers: (params: {
    query?: string;
    status?: AccountStatus;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.query) q.set("query", params.query);
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return apiFetch<{
      items: AdminUserListItem[];
      total: number;
      page: number;
    }>(`/api/admin/users?${q}`);
  },

  getUser: (id: string) =>
    apiFetch<{ user: AdminUserDetail }>(`/api/admin/users/${id}`),

  getUserConversations: (id: string) =>
    apiFetch<{ items: Conversation[] }>(
      `/api/admin/users/${id}/conversations`,
    ),

  getConversation: (id: string) =>
    apiFetch<{ conversation: Conversation; messages: Message[] }>(
      `/api/admin/conversations/${id}`,
    ),

  setStatus: (id: string, status: WritableAccountStatus) =>
    apiFetch<{ id: string; status: WritableAccountStatus }>(
      `/api/admin/users/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    ),

  setRole: (id: string, role: Role) =>
    apiFetch<{ id: string; role: Role }>(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  resetPassword: (id: string, newPassword?: string) =>
    apiFetch<{ id: string; temporaryPassword?: string }>(
      `/api/admin/users/${id}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify(newPassword ? { newPassword } : {}),
      },
    ),

  reloadKnowledge: () =>
    apiFetch<{ projectIds: string[] }>("/api/admin/knowledge/reload", {
      method: "POST",
    }),

  listAudit: (params?: { limit?: number; before?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.before) q.set("before", params.before);
    const qs = q.toString();
    return apiFetch<{ items: AuditEntry[] }>(
      `/api/admin/audit${qs ? `?${qs}` : ""}`,
    );
  },

  listGaps: (params?: { status?: KnowledgeGapStatus; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    const qs = q.toString();
    return apiFetch<{
      items: KnowledgeGapItem[];
      total: number;
      page: number;
    }>(`/api/admin/gaps${qs ? `?${qs}` : ""}`);
  },

  updateGap: (id: string, status: KnowledgeGapStatus) =>
    apiFetch<{
      id: string;
      status: KnowledgeGapStatus;
      resolvedAt: string | null;
      resolvedBy: string | null;
    }>(`/api/admin/gaps/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
