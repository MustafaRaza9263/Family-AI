'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiError } from '@/lib/api-client';
import { useRegister } from './hooks';
import { RegisterSuccess } from './register-success';
import { registerFormSchema, type RegisterFormValues } from './schemas';

export function RegisterForm() {
  const registerMutation = useRegister();
  const [done, setDone] = useState(false);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      website: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { confirmPassword: _confirm, ...body } = values;
      void _confirm;
      await registerMutation.mutateAsync(body);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_TAKEN') {
          form.setError('email', { message: 'Email is already registered' });
        } else if (err.details?.length) {
          for (const detail of err.details) {
            const key = detail.path as keyof RegisterFormValues;
            form.setError(key, { message: detail.message });
          }
        } else {
          form.setError('root', { message: err.message });
        }
      } else {
        form.setError('root', {
          message: 'Something went wrong. Please try again.',
        });
      }
      const first = document.querySelector<HTMLElement>('[name]');
      // Prefer focusing the first invalid field.
      const invalid = document.querySelector<HTMLElement>(
        'input[aria-invalid="true"], [role="alert"]',
      );
      (invalid ?? first)?.focus();
    }
  });

  if (done) {
    return <RegisterSuccess />;
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <Field
        id="fullName"
        label="Full name"
        error={form.formState.errors.fullName?.message}
      >
        <Input
          id="fullName"
          autoComplete="name"
          {...form.register('fullName')}
        />
      </Field>
      <Field
        id="email"
        label="Email"
        error={form.formState.errors.email?.message}
      >
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
        hint="At least 10 characters"
        error={form.formState.errors.password?.message}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
      </Field>
      <Field
        id="confirmPassword"
        label="Confirm password"
        error={form.formState.errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          {...form.register('confirmPassword')}
        />
      </Field>

      {/* Honeypot — hidden from humans, bots often fill it. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...form.register('website')}
        />
      </div>

      {form.formState.errors.root?.message ? (
        <p className="text-sm text-danger" role="alert">
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        loading={registerMutation.isPending}
      >
        Request account
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Your prompts and generations are stored on company servers and can be
        seen by admins.
      </p>
    </form>
  );
}
