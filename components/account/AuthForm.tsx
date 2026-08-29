'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { fieldErrorsOf, useLogin, useRegister } from '@/lib/client/queries/account';
import { ApiError } from '@/lib/client/apiClient';
import { loginSchema, registerSchema } from '@/lib/shared/auth-schemas';

export type AuthMode = 'signin' | 'register';

export interface AuthFormProps {
  mode: AuthMode;
}

/**
 * Sign-in and registration share this component because they share every meaningful decision:
 * the same validation source (`lib/shared/auth-schemas`, the same module the route handler
 * validates with), the same error surface, and the same post-success redirect. Splitting them
 * would mean maintaining two copies of that and letting them drift.
 *
 * Errors land in three places by design: `fieldErrors` from the API render inline under the
 * offending input, client-side zod issues do the same before any request is sent, and anything
 * unattributable (network, 500) renders once at the top of the form.
 */
export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useRegister();
  const login = useLogin();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const mutation = mode === 'register' ? register : login;
  const isRegister = mode === 'register';

  // Only same-origin paths are honoured, so `?next=https://evil.example` cannot turn the
  // sign-in page into an open redirect.
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const serverErrors = fieldErrorsOf(mutation.error);
  const errors = { ...serverErrors, ...clientErrors };

  const formError =
    mutation.error && Object.keys(serverErrors).length === 0
      ? mutation.error instanceof ApiError
        ? mutation.error.message
        : 'Something went wrong. Please try again.'
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = isRegister
      ? registerSchema.safeParse({ displayName, email, password })
      : loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      const issues: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '_');
        issues[key] ??= issue.message;
      }
      setClientErrors(issues);
      return;
    }

    setClientErrors({});
    try {
      if (isRegister) {
        await register.mutateAsync(parsed.data as { displayName: string; email: string; password: string });
      } else {
        await login.mutateAsync(parsed.data as { email: string; password: string });
      }
      router.push(next);
      router.refresh();
    } catch {
      // Rendered from `mutation.error` above — nothing to do here, but the rejection must be
      // caught or it surfaces as an unhandled promise rejection in the console.
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError ? (
        <p
          role="alert"
          className="rounded-md border border-[color:rgb(251_113_133_/_0.45)] bg-[rgb(251_113_133_/_0.08)] px-3 py-2 text-sm text-ada-danger"
        >
          {formError}
        </p>
      ) : null}

      {isRegister ? (
        <Field label="Name" error={errors.displayName} required>
          <Input
            name="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Field>
      ) : null}

      <Field label="Email" error={errors.email} required>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@studio.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field
        label="Password"
        error={errors.password}
        hint={isRegister ? 'At least 8 characters.' : undefined}
        required
      >
        <Input
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" size="lg" loading={mutation.isPending} className="mt-1 w-full">
        {isRegister ? 'Create account' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-ada-text-muted">
        {isRegister ? 'Already have an account? ' : 'New to Adamantite? '}
        <Link
          href={isRegister ? '/signin' : '/register'}
          className="font-medium text-ada-cyan-200 underline decoration-ada-cyan-300/40 underline-offset-4 transition hover:text-ada-cyan-100"
        >
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}
