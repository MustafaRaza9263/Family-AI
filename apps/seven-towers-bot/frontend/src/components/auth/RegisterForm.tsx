"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { PRIVACY_NOTICE } from "@/lib/config";
import {
  fieldErrorMessage,
  inferRegisterFields,
  messageForErrorCode,
} from "@/lib/errors-ui";

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<ApiError["fields"]>();
  const [busy, setBusy] = useState(false);
  const fe = (path: string) => fieldErrorMessage(fields, path);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFields(undefined);
    if (!consent) {
      setFormError("Please accept the privacy notice to continue.");
      return;
    }
    setBusy(true);
    try {
      const user = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        website: website || undefined,
      });
      router.replace(user ? "/" : "/login/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "VALIDATION_ERROR") {
          const nextFields = err.fields?.length
            ? err.fields
            : inferRegisterFields(err.message);
          setFields(nextFields);
          setFormError(
            nextFields?.length
              ? "Fix the highlighted fields and try again."
              : err.message,
          );
        } else if (err.code === "EMAIL_TAKEN") {
          setFormError(messageForErrorCode("EMAIL_TAKEN"));
        } else {
          setFormError(messageForErrorCode(err.code, err.message));
        }
      } else {
        setFormError(messageForErrorCode("NETWORK"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="relative flex flex-col gap-4" onSubmit={onSubmit}>
      <h2 className="text-lg font-medium text-text">Create account</h2>
      {formError ? (
        <p className="text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(ev) => setWebsite(ev.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 overflow-hidden opacity-0"
      />
      <Input label="Full name" autoComplete="name" required value={fullName} error={fe("fullName")} onChange={(ev) => setFullName(ev.target.value)} />
      <Input label="Email" type="email" autoComplete="email" required value={email} error={fe("email")} onChange={(ev) => setEmail(ev.target.value)} />
      <Input label="Phone" type="tel" autoComplete="tel" placeholder="+92 300 1234567" hint="Local numbers work" required value={phone} error={fe("phone")} onChange={(ev) => setPhone(ev.target.value)} />
      <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} error={fe("password")} onChange={(ev) => setPassword(ev.target.value)} />
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setShowPassword((v) => !v)}>
        {showPassword ? "Hide password" : "Show password"}
      </Button>
      <label className="flex gap-3 text-sm text-text">
        <input type="checkbox" checked={consent} onChange={(ev) => setConsent(ev.target.checked)} className="mt-1 h-4 w-4 rounded-md border-border" />
        <span>{PRIVACY_NOTICE}</span>
      </label>
      <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Register"}</Button>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login/" className="font-medium text-accent">Sign in</Link>
      </p>
    </form>
  );
}
