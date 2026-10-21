"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { registerAuthHandlers } from "@/lib/api";
import { authApi } from "@/lib/api-auth";
import type { User } from "@/lib/types";

type AuthStatus = "loading" | "authed" | "anon";

type RegisterBody = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  website?: string;
};

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<User>;
  register: (body: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.user);
      setStatus("authed");
    } catch {
      setUser(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    registerAuthHandlers({
      onUnauthorized: () => {
        setUser(null);
        setStatus("anon");
        router.replace("/login/");
      },
      onPasswordChangeRequired: () => {
        router.replace("/change-password/");
      },
    });
    // Defer so the effect only registers handlers synchronously.
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh, router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    setStatus("authed");
    return res.user;
  }, []);

  const register = useCallback(async (body: RegisterBody) => {
    await authApi.register(body);
    setUser(null);
    setStatus("anon");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setStatus("anon");
      router.replace("/login/");
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, status, login, register, logout, refresh }),
    [user, status, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
