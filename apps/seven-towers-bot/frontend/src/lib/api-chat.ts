import { apiFetch } from "./api";
import type { Conversation, Message } from "./types";

export const chatApi = {
  listConversations: (params?: { limit?: number; before?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.before) q.set("before", params.before);
    const qs = q.toString();
    return apiFetch<{ items: Conversation[]; nextBefore: string | null }>(
      `/api/conversations${qs ? `?${qs}` : ""}`,
    );
  },

  getConversation: (id: string) =>
    apiFetch<{ conversation: Conversation; messages: Message[] }>(
      `/api/conversations/${id}`,
    ),
};
