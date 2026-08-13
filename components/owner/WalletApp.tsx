'use client';

import { useEffect, useMemo, useState } from 'react';

import { HudFrame } from '@/components/hud/HudFrame';
import { Button } from '@/components/ui/Button';
import { formatMoney, readWalletEntries, seedEntries, writeWalletEntries, type WalletEntry } from '@/components/billing/wallet';

export function WalletApp() {
  const [entries, setEntries] = useState<WalletEntry[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setEntries(readWalletEntries()), 0);
    const handleUpdate = () => setEntries(readWalletEntries());
    window.addEventListener('ada-wallet-updated', handleUpdate);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('ada-wallet-updated', handleUpdate);
    };
  }, []);

  const totals = useMemo(
    () =>
      entries.reduce(
        (sum, entry) => ({
          gross: sum.gross + entry.grossCents,
          owner: sum.owner + entry.ownerCents,
          provider: sum.provider + entry.providerCents,
          credits: sum.credits + entry.providerPoolCredits,
        }),
        { gross: 0, owner: 0, provider: 0, credits: 0 },
      ),
    [entries],
  );

  function resetDemo() {
    const seeded = seedEntries();
    writeWalletEntries(seeded);
    setEntries(seeded);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <WalletMetric label="Gross subscriptions" value={formatMoney(totals.gross)} />
        <WalletMetric label="Owner wallet" value={formatMoney(totals.owner)} tone="owner" />
        <WalletMetric label="Provider funding" value={formatMoney(totals.provider)} tone="provider" />
        <WalletMetric label="Provider credits" value={totals.credits.toLocaleString()} />
      </div>

      <HudFrame tone="active" brackets>
        <section className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Split ledger</h2>
              <p className="text-sm text-ada-text-muted">
                Local owner-only simulation of subscription splits. Real transfers need a payment processor and payout account.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={resetDemo}>
              Reset demo
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--color-ada-line)] text-xs uppercase text-ada-blue-400">
                  <th className="py-3 pr-4">Time</th>
                  <th className="py-3 pr-4">Plan</th>
                  <th className="py-3 pr-4">Gross</th>
                  <th className="py-3 pr-4">Owner wallet</th>
                  <th className="py-3 pr-4">Provider pool</th>
                  <th className="py-3 pr-4">API credits</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[color:var(--color-ada-line-quiet)]">
                    <td className="py-3 pr-4 font-mono text-xs text-ada-text-muted">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="py-3 pr-4">{entry.planName}</td>
                    <td className="py-3 pr-4 font-mono">{formatMoney(entry.grossCents)}</td>
                    <td className="py-3 pr-4 font-mono text-ada-success">{formatMoney(entry.ownerCents)}</td>
                    <td className="py-3 pr-4 font-mono text-ada-cyan-400">{formatMoney(entry.providerCents)}</td>
                    <td className="py-3 pr-4 font-mono">{entry.providerPoolCredits.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </HudFrame>
    </div>
  );
}

function WalletMetric({ label, value, tone }: { label: string; value: string; tone?: 'owner' | 'provider' }) {
  const valueClass = tone === 'owner' ? 'text-ada-success' : tone === 'provider' ? 'text-ada-cyan-400' : 'text-ada-text';
  return (
    <HudFrame>
      <div className="p-4">
        <div className="text-xs uppercase text-ada-blue-400">{label}</div>
        <div className={`mt-3 text-2xl font-semibold ${valueClass}`}>{value}</div>
      </div>
    </HudFrame>
  );
}
