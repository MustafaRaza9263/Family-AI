import { apiFetch } from "./api";
import type { User } from "./types";

export const authApi = {
  me: () => apiFetch<{ user: User }>("/api/auth/me"),

  login: (email: string, password: string) =>
    apiFetch<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (body: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    website?: string;
  }) =>
    apiFetch<{ user?: User; ok?: true }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logout: () =>
    apiFetch<void>("/api/auth/logout", { method: "POST" }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<void>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};
