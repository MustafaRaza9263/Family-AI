export type Role = "user" | "admin";
export type AccountStatus = "pending" | "active" | "disabled";
/** Status values an admin may set (pending is signup-only). */
export type WritableAccountStatus = "active" | "disabled";

export type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  mustChangePassword: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  projectId: string;
  updatedAt: string;
  createdAt?: string;
  userId?: string;
};

export type ImageAttachmentItem = {
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
};

export type ImageAttachment = {
  type: "images";
  caption?: string;
  items: ImageAttachmentItem[];
};

/** Tables are GFM markdown in the message body, not separate attachments. */
export type Attachment = ImageAttachment;

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments: Attachment[];
  createdAt: string;
  model?: string;
  finishReason?: string;
  guardFlags?: string[];
  streaming?: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: { path: string; message: string }[];
  };
};

export type SseMetaEvent = {
  conversationId: string;
  userMessageId: string;
  model: string;
};
export type SseTokenEvent = { text: string };
export type SseAttachmentEvent = Attachment;
export type SseDoneEvent = {
  messageId: string;
  finishReason: string;
  usage: { promptTokens: number; completionTokens: number };
  ttftMs?: number | null;
  latencyMs: number;
};
export type SseErrorEvent = { code: string; message: string };

export type SseEvent =
  | { event: "meta"; data: SseMetaEvent }
  | { event: "token"; data: SseTokenEvent }
  | { event: "attachment"; data: SseAttachmentEvent }
  | { event: "done"; data: SseDoneEvent }
  | { event: "error"; data: SseErrorEvent };

export type AdminUserListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt: string | null;
  conversationCount: number;
};

export type AdminUserDetail = AdminUserListItem & {
  mustChangePassword: boolean;
};

export type AuditEntry = {
  id: string;
  actorId: string;
  action: string;
  targetUserId?: string;
  targetConversationId?: string;
  ip?: string | null;
  meta?: unknown;
  at: string;
};
