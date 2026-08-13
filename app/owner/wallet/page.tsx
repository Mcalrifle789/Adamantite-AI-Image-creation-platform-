import Link from 'next/link';

import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/Button';
import { WalletApp } from '@/components/owner/WalletApp';

export default function OwnerWalletPage() {
  return (
    <main className="min-h-screen px-4 py-5 text-ada-text sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[var(--container-content)] flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Adamantite home" className="inline-flex">
            <Wordmark size="header" />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
        </header>
        <section className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-normal">Owner wallet</h1>
          <p className="mt-3 text-lg text-ada-text-muted">
            Private app surface for tracking the 50/50 subscription split between owner balance
            and the shared provider API funding pool.
          </p>
        </section>
        <WalletApp />
      </div>
    </main>
  );
}
