import {
  loginRequestSchema,
  loginResponseSchema,
  meResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  type LoginRequest,
  type RegisterRequest,
} from '@studio/shared';
import { z } from 'zod';
import { apiFetch, apiFetchOrNull } from '@/lib/api-client';

export async function fetchMe() {
  return apiFetchOrNull('/api/me', meResponseSchema);
}

export async function login(body: LoginRequest) {
  const parsed = loginRequestSchema.parse(body);
  return apiFetch('/api/auth/login', loginResponseSchema, {
    method: 'POST',
    body: JSON.stringify(parsed),
  });
}

export async function register(body: RegisterRequest) {
  const parsed = registerRequestSchema.parse(body);
  return apiFetch('/api/auth/register', registerResponseSchema, {
    method: 'POST',
    body: JSON.stringify(parsed),
  });
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', z.unknown(), {
    method: 'POST',
  });
}
