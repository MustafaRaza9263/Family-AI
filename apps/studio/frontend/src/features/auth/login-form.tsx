'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema } from '@studio/shared';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiError } from '@/lib/api-client';
import { useLogin } from './hooks';

type FormValues = z.infer<typeof loginRequestSchema>;

function loginErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return 'Something went wrong. Please try again.';
  }
  switch (err.code) {
    case 'INVALID_CREDENTIALS':
      return 'Incorrect email or password.';
    case 'ACCOUNT_PENDING':
      return 'Your account is waiting for admin approval.';
    case 'ACCOUNT_DISABLED':
      return 'This account has been disabled. Please contact your admin.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please try again in a few minutes.';
    default:
      return err.message;
  }
}

export function LoginForm() {
  const login = useLogin();
  const form = useForm<FormValues>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
    } catch (err) {
      form.setError('root', { message: loginErrorMessage(err) });
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <Field id="email" label="Email" error={form.formState.errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register('email')}
        />
      </Field>
      <Field
        id="password"
        label="Password"
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="password"
          autoComplete="current-password"
          {...form.register('password')}
        />
      </Field>

      {form.formState.errors.root?.message ? (
        <p className="text-sm text-danger" role="alert">
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" loading={login.isPending}>
        Sign in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Forgot your password? Ask your admin to reset it.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register/" className="font-medium text-primary hover:underline">
          Request access
        </Link>
      </p>
    </form>
  );
}
