import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { AccountMenu } from '@/components/account/AccountMenu';
import { AccountPanel } from '@/components/account/AccountPanel';
import { Wordmark } from '@/components/brand/Wordmark';
import { getCurrentAccount } from '@/lib/server/auth/accounts';

export const metadata: Metadata = {
  title: 'Account — Adamantite Agent',
  description: 'Your Adamantite Agent account.',
};

// The session cookie is read per request, so this page can never be statically prerendered.
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  // Guarding on the server means a signed-out visitor is redirected before any HTML ships,
  // rather than seeing a skeleton that then bounces them to /signin.
  const account = await getCurrentAccount();
  if (!account) redirect('/signin?next=/account');

  return (
    <main className="relative min-h-screen px-5 pb-20 pt-6 text-ada-text sm:px-8 lg:px-12">
      <nav className="glass-bar glass-sheen sticky top-4 z-30 mx-auto mt-4 flex max-w-[64rem] items-center justify-between gap-4 py-3 pl-5 pr-3">
        <Link href="/" aria-label="Adamantite Agent home" className="inline-flex items-center">
          <Wordmark size="header" withAgent={false} as="span" className="text-2xl" />
        </Link>
        <AccountMenu />
      </nav>

      <div className="mx-auto mt-8 max-w-[64rem]">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ada-text">Account</h1>
        <AccountPanel />
      </div>
    </main>
  );
}
