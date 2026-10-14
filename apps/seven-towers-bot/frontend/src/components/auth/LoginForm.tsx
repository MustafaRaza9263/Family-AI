"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { SUPPORT_TEXT } from "@/lib/config";
import { messageForErrorCode } from "@/lib/errors-ui";

const INLINE_CODES = new Set([
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "ACCOUNT_DISABLED",
]);

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      if (user.mustChangePassword) {
        router.replace("/change-password/");
      } else {
        router.replace("/");
      }
    } catch (err) {
      if (err instanceof ApiError && INLINE_CODES.has(err.code)) {
        let msg = messageForErrorCode(err.code, err.message);
        if (err.code === "ACCOUNT_LOCKED") {
          msg = `${msg} You can retry after the lockout period.`;
        }
        setFormError(msg);
      } else if (err instanceof ApiError) {
        setFormError(messageForErrorCode(err.code, err.message));
      } else {
        setFormError(messageForErrorCode("NETWORK"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <h2 className="text-lg font-medium text-text">Sign in</h2>
      {formError ? (
        <p className="text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(ev) => setEmail(ev.target.value)}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
      />
      <Button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-sm text-muted">
        No account?{" "}
        <Link href="/register/" className="font-medium text-accent">
          Register
        </Link>
      </p>
      <p className="text-sm text-muted">{SUPPORT_TEXT}</p>
    </form>
  );
}
