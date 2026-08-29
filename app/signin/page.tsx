import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AuthForm } from '@/components/account/AuthForm';
import { AuthShell } from '@/components/account/AuthShell';

export const metadata: Metadata = {
  title: 'Sign in — Adamantite Agent',
  description: 'Sign in to your Adamantite Agent account.',
};

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to reach your studio and your credits.">
      {/* AuthForm reads `?next=` via useSearchParams, which requires a Suspense boundary so the
          rest of the page can still be statically prerendered. */}
      <Suspense fallback={<div className="h-72" aria-hidden />}>
        <AuthForm mode="signin" />
      </Suspense>
    </AuthShell>
  );
}
