/** Hard caps used across auth, chat, and LLM. Keep numbers here so services stay readable. */

/** Max characters allowed in one user chat message. */
export const MAX_MESSAGE_CHARS = 1500;

/** Max completion tokens requested from the LLM per answer. */
export const MAX_ANSWER_TOKENS = 4096;

/** How many prior messages to load into the model context. */
export const MAX_HISTORY_MESSAGES = 10;

/** Max tool-call rounds before the agent must stop. */
export const MAX_TOOL_ROUNDS = 3;

/** Rough chars-per-token used for context budgeting (conservative). */
export const CHARS_PER_TOKEN_ESTIMATE = 3;

/** Reserved tokens for tool schemas / formatting outside the system prompt. */
export const CONTEXT_OVERHEAD_TOKENS = 600;

/** Chat requests allowed per user per minute. */
export const CHAT_PER_MINUTE = 20;

/** Chat requests allowed per user per day. */
export const CHAT_PER_DAY = 200;

/** Signups allowed per IP per hour. */
export const SIGNUPS_PER_HOUR_PER_IP = 5;

/** Login attempts allowed per IP per 15 minutes. */
export const LOGINS_PER_15_MIN_PER_IP = 10;

/** General API requests allowed per IP per minute. */
export const API_PER_MINUTE_PER_IP = 300;

/** Max concurrent chat streams across all users. */
export const MAX_IN_FLIGHT_CHATS = 6;

/** Wrong passwords before the account locks. */
export const LOGIN_MAX_FAILURES = 5;

/** How long a locked account stays locked. */
export const LOGIN_LOCK_MINUTES = 15;

/** SSE comment heartbeat interval in milliseconds. */
export const SSE_HEARTBEAT_MS = 15000;

/** Minimum password length. */
export const PASSWORD_MIN = 8;

/** Maximum password length. */
export const PASSWORD_MAX = 128;

/** Renew the session cookie only after this many idle minutes. */
export const SESSION_RENEW_AFTER_MINUTES = 60;
