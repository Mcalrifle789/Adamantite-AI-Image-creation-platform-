'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/client/apiClient';
import { fieldErrorsOf, useAccountSession, useUpdateAccount } from '@/lib/client/queries/account';
import { formatDate } from '@/lib/shared/format';
import { AccountAvatar } from './AccountAvatar';

/**
 * The account page body — what "click your profile in the top right" leads to.
 *
 * Two independent forms rather than one: a profile edit (name/email) and a password change.
 * Merging them would force someone renaming themselves to also type their current password,
 * and would make one failed field block the other's save.
 */
export function AccountPanel() {
  const { data: session, isPending, isError, refetch } = useAccountSession();
  const router = useRouter();

  useEffect(() => {
    // The page is only reachable signed in; the server component redirects, and this covers
    // the case where the session expires while the tab is open.
    if (!isPending && !isError && session === null) router.replace('/signin?next=/account');
  }, [isPending, isError, session, router]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="neon-bracket p-6 text-center">
        <span aria-hidden className="neon-bracket__corners" />
        <p className="text-sm text-ada-text-muted">We could not load your account.</p>
        <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!session) return null;

  const { account, plan } = session;

  return (
    <div className="flex flex-col gap-6">
      <IdentityCard
        initials={account.initials}
        seed={account.id}
        displayName={account.displayName}
        email={account.email}
        planName={plan.name}
        planPriceCents={plan.priceCents}
        monthlyCredits={plan.monthlyCredits}
        createdAt={account.createdAt}
        lastLoginAt={account.lastLoginAt}
      />
      <ProfileForm initialDisplayName={account.displayName} initialEmail={account.email} />
      <PasswordForm />
    </div>
  );
}

function IdentityCard({
  initials,
  seed,
  displayName,
  email,
  planName,
  planPriceCents,
  monthlyCredits,
  createdAt,
  lastLoginAt,
}: {
  initials: string;
  seed: string;
  displayName: string;
  email: string;
  planName: string;
  planPriceCents: number;
  monthlyCredits: number;
  createdAt: string;
  lastLoginAt: string | null;
}) {
  return (
    <section className="neon-bracket p-6 sm:p-7">
      <span aria-hidden className="neon-bracket__corners" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <AccountAvatar initials={initials} seed={seed} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-ada-text">{displayName}</h2>
            <p className="truncate text-sm text-ada-text-muted">{email}</p>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href="/pricing">Change plan</Link>
        </Button>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-6 lg:grid-cols-4">
        <Stat label="Plan" value={planName} detail={`$${(planPriceCents / 100).toFixed(2)} / month`} />
        <Stat
          label="Monthly credits"
          value={monthlyCredits.toLocaleString()}
          detail="Refreshed each billing period"
        />
        <Stat label="Member since" value={formatDate(createdAt)} />
        <Stat label="Last sign-in" value={lastLoginAt ? formatDate(lastLoginAt) : 'This session'} />
      </dl>
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-medium uppercase tracking-[0.1em] text-ada-text-muted">
        {label}
      </dt>
      <dd className="mt-1.5 text-base font-semibold text-ada-text">{value}</dd>
      {detail ? <p className="mt-0.5 text-xs text-ada-text-muted">{detail}</p> : null}
    </div>
  );
}

function ProfileForm({
  initialDisplayName,
  initialEmail,
}: {
  initialDisplayName: string;
  initialEmail: string;
}) {
  const update = useUpdateAccount();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState(initialEmail);
  const [saved, setSaved] = useState(false);

  const errors = fieldErrorsOf(update.error);
  const dirty = displayName !== initialDisplayName || email !== initialEmail;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    try {
      await update.mutateAsync({ displayName, email });
      setSaved(true);
    } catch {
      // Surfaced through `update.error` below.
    }
  }

  return (
    <FormCard
      title="Profile"
      description="Your name is what appears next to your avatar."
      onSubmit={handleSubmit}
      error={update.error && Object.keys(errors).length === 0 ? messageOf(update.error) : null}
      success={saved ? 'Profile updated.' : null}
      submitLabel="Save changes"
      submitting={update.isPending}
      disabled={!dirty}
    >
      <Field label="Name" error={errors.displayName}>
        <Input
          name="name"
          autoComplete="name"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setSaved(false);
          }}
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setSaved(false);
          }}
        />
      </Field>
    </FormCard>
  );
}

function PasswordForm() {
  const update = useUpdateAccount();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const errors = fieldErrorsOf(update.error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    if (newPassword !== confirmPassword) {
      setMismatch('Those passwords do not match.');
      return;
    }
    setMismatch(null);

    try {
      await update.mutateAsync({ currentPassword, newPassword });
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // Surfaced through `update.error` below.
    }
  }

  return (
    <FormCard
      title="Password"
      description="Changing your password signs out every other device."
      onSubmit={handleSubmit}
      error={update.error && Object.keys(errors).length === 0 ? messageOf(update.error) : null}
      success={saved ? 'Password changed.' : null}
      submitLabel="Change password"
      submitting={update.isPending}
      disabled={!currentPassword || !newPassword || !confirmPassword}
    >
      <Field label="Current password" error={errors.currentPassword}>
        <Input
          name="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </Field>
      <Field label="New password" error={errors.newPassword} hint="At least 8 characters.">
        <Input
          name="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </Field>
      <Field label="Confirm new password" error={mismatch}>
        <Input
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </Field>
    </FormCard>
  );
}

function FormCard({
  title,
  description,
  onSubmit,
  error,
  success,
  submitLabel,
  submitting,
  disabled,
  children,
}: {
  title: string;
  description: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error: string | null;
  success: string | null;
  submitLabel: string;
  submitting: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="neon-bracket p-6 sm:p-7">
      <span aria-hidden className="neon-bracket__corners" />
      <h2 className="text-lg font-semibold text-ada-text">{title}</h2>
      <p className="mt-1 text-sm text-ada-text-muted">{description}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-[color:rgb(251_113_133_/_0.45)] bg-[rgb(251_113_133_/_0.08)] px-3 py-2 text-sm text-ada-danger"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            role="status"
            className="rounded-md border border-[color:rgb(52_211_153_/_0.4)] bg-[rgb(52_211_153_/_0.08)] px-3 py-2 text-sm text-ada-success"
          >
            {success}
          </p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">{children}</div>

        <div className="flex justify-end">
          <Button type="submit" loading={submitting} disabled={disabled}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
