"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "anon") {
      router.replace("/login/");
      return;
    }
    if (user?.mustChangePassword) {
      router.replace("/change-password/");
    }
  }, [status, user, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner />
      </div>
    );
  }

  if (status === "anon" || user?.mustChangePassword) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner label="Redirecting" />
      </div>
    );
  }

  return children;
}
