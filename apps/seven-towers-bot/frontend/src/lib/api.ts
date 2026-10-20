import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: { path: string; message: string }[];

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type UnauthorizedHandler = () => void;
type PasswordChangeHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;
let onPasswordChangeRequired: PasswordChangeHandler | null = null;

export function registerAuthHandlers(handlers: {
  onUnauthorized: UnauthorizedHandler;
  onPasswordChangeRequired: PasswordChangeHandler;
}): void {
  onUnauthorized = handlers.onUnauthorized;
  onPasswordChangeRequired = handlers.onPasswordChangeRequired;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    // Non-JSON error bodies still become a typed ApiError.
  }
  const code = body?.error?.code ?? "INTERNAL";
  const message =
    body?.error?.message ?? (res.statusText || "Request failed");
  const fields = body?.error?.details;
  return new ApiError(res.status, code, message, fields);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    const err = await parseError(res);
    if (err.code === "UNAUTHENTICATED") onUnauthorized?.();
    throw err;
  }
  if (res.status === 403) {
    const err = await parseError(res);
    if (err.code === "PASSWORD_CHANGE_REQUIRED") {
      onPasswordChangeRequired?.();
    }
    throw err;
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
