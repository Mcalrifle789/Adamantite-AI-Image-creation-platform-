import { Suspense } from 'react';
import type { Metadata } from 'next';

import { AuthForm } from '@/components/account/AuthForm';
import { AuthShell } from '@/components/account/AuthShell';

export const metadata: Metadata = {
  title: 'Create account — Adamantite Agent',
  description: 'Create an Adamantite Agent account.',
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Every model in the catalogue, one refined workspace."
    >
      <Suspense fallback={<div className="h-80" aria-hidden />}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthShell>
  );
}
