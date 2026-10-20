"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authed" || !user) return;
    if (user.mustChangePassword) {
      router.replace("/change-password/");
    } else {
      router.replace("/");
    }
  }, [status, user, router]);

  if (status === "loading" || status === "authed") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Spinner />
      </div>
    );
  }

  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
