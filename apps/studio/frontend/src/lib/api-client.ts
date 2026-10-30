import {
  apiErrorBodySchema,
  type ApiErrorCode,
  type ApiErrorDetail,
} from '@studio/shared';
import type { ZodType } from 'zod';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | string;
  readonly details?: ApiErrorDetail[];
  readonly requestId?: string;

  constructor(
    status: number,
    code: ApiErrorCode | string,
    message: string,
    details?: ApiErrorDetail[],
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON bodies still become a typed ApiError.
  }
  const parsed = apiErrorBodySchema.safeParse(body);
  if (parsed.success) {
    return new ApiError(
      res.status,
      parsed.data.error.code,
      parsed.data.error.message,
      parsed.data.error.details,
      parsed.data.error.requestId,
    );
  }
  return new ApiError(res.status, 'INTERNAL', res.statusText || 'Request failed');
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/login') || path.startsWith('/register')) return;
  // Full navigation: session is gone; App Router soft nav would keep stale state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard redirect on 401
  window.location.assign('/login/');
}

export async function apiFetch<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    redirectToLogin();
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(500, 'INTERNAL', 'Unexpected response from server');
  }
  return parsed.data;
}

/** Like apiFetch but treats 401 on session probes as signed-out. */
export async function apiFetchOrNull<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T | null> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) return null;
  if (!res.ok) throw await parseError(res);

  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(500, 'INTERNAL', 'Unexpected response from server');
  }
  return parsed.data;
}
