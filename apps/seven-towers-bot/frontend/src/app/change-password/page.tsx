"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";

export default function ChangePasswordPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anon") {
      router.replace("/login/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner />
      </div>
    );
  }

  if (status === "anon") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner label="Redirecting" />
      </div>
    );
  }

  return (
    <AuthShell>
      <ChangePasswordForm />
    </AuthShell>
  );
}
