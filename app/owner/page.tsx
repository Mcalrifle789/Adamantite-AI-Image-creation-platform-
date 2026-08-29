import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { AccountMenu } from '@/components/account/AccountMenu';
import { Wordmark } from '@/components/brand/Wordmark';
import { HudFrame } from '@/components/hud/HudFrame';
import {
  getCurrentAccount,
  getOwnerAnalytics,
  isOwnerAccount,
} from '@/lib/server/auth/accounts';
import { formatDate } from '@/lib/shared/format';

export const metadata: Metadata = {
  title: 'Owner dashboard - Adamantite Agent',
  description: 'Owner-only site analytics for Adamantite Agent.',
};

export const dynamic = 'force-dynamic';

export default async function OwnerDashboardPage() {
  const account = await getCurrentAccount();
  if (!account) redirect('/signin?next=/owner');
  if (!isOwnerAccount(account)) redirect('/account');

  const analytics = await getOwnerAnalytics(account);

  return (
    <main className="relative min-h-screen px-5 pb-20 pt-6 text-ada-text sm:px-8 lg:px-12">
      <nav className="glass-bar glass-sheen sticky top-4 z-30 mx-auto mt-4 flex max-w-[80rem] items-center justify-between gap-4 py-3 pl-5 pr-3">
        <Link href="/" aria-label="Adamantite Agent home" className="inline-flex items-center">
          <Wordmark size="header" withAgent={false} as="span" className="text-2xl" />
        </Link>
        <AccountMenu />
      </nav>

      <div className="mx-auto mt-8 max-w-[80rem]">
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ada-cyan-300">
            Owner dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-ada-text">
            Site analytics
          </h1>
          <p className="max-w-2xl text-sm text-ada-text-muted">
            Owner access is reserved for {analytics.ownerEmail}.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Total accounts" value={analytics.totalAccounts.toLocaleString()} />
          <Metric label="Owner account" value={analytics.ownerPresent ? 'Present' : 'Missing'} />
          <Metric label="Sign-ins, 24h" value={analytics.signInsLast24h.toLocaleString()} />
          <Metric label="Sign-ins, 7d" value={analytics.signInsLast7d.toLocaleString()} />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <AccountTable title="Newest accounts" accounts={analytics.recentAccounts} />
          <AccountTable title="Recent sign-ins" accounts={analytics.recentSignIns} />
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <HudFrame>
      <div className="p-4">
        <div className="text-xs uppercase tracking-[0.12em] text-ada-blue-400">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-ada-text">{value}</div>
      </div>
    </HudFrame>
  );
}

interface OwnerAccountRow {
  id: string;
  displayName: string;
  email: string;
  planId: string;
  role: 'owner' | 'user';
  createdAt: string;
  lastLoginAt: string | null;
}

function AccountTable({ title, accounts }: { title: string; accounts: OwnerAccountRow[] }) {
  return (
    <HudFrame tone="active" brackets>
      <section className="p-5">
        <h2 className="text-lg font-semibold text-ada-text">{title}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-ada-line)] text-xs uppercase tracking-[0.08em] text-ada-blue-400">
                <th className="py-3 pr-4">Account</th>
                <th className="py-3 pr-4">Plan</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Created</th>
                <th className="py-3 pr-4">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length ? (
                accounts.map((account) => (
                  <tr key={account.id} className="border-b border-[color:var(--color-ada-line-quiet)]">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-ada-text">{account.displayName}</div>
                      <div className="text-xs text-ada-text-muted">{account.email}</div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{account.planId}</td>
                    <td className="py-3 pr-4">{account.role}</td>
                    <td className="py-3 pr-4">{formatDate(account.createdAt)}</td>
                    <td className="py-3 pr-4">
                      {account.lastLoginAt ? formatDate(account.lastLoginAt) : 'Never'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ada-text-muted">
                    No accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </HudFrame>
  );
}
