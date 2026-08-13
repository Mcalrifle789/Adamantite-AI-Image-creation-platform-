import { PLANS, ORDERED_PLAN_IDS } from '@/config/plans';
import { MODELS } from '@/config/models';
import { Wordmark } from '@/components/brand/Wordmark';
import { HudFrame } from '@/components/hud/HudFrame';
import { Button } from '@/components/ui/Button';
import { CheckoutButton } from '@/components/billing/CheckoutButton';
import type { MediaKind, ModelTier } from '@/lib/shared/api-types';
import Link from 'next/link';

const tierOrder: ModelTier[] = ['budget', 'mid', 'premium', 'high_end'];
const kindOrder: MediaKind[] = ['image', 'video'];

export default function PricingPage() {
  const unitPrices = buildUnitPrices();

  return (
    <main className="min-h-screen px-4 py-5 text-ada-text sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[var(--container-content)] flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Adamantite home" className="inline-flex">
            <Wordmark size="header" />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/workspace/demo">Workspace</Link>
          </Button>
        </header>

        <section className="grid gap-5">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-normal text-ada-text">Subscription credits</h1>
            <p className="mt-3 text-lg text-ada-text-muted">
              Four plans fund one shared model key through integer credits. Every tier stays
              available; the plan only changes monthly volume and concurrency.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ORDERED_PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              return (
                <HudFrame key={id} tone={id === 'standard' ? 'active' : 'default'} brackets={id === 'standard'}>
                  <article className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-semibold">{plan.name}</h2>
                        <p className="mt-1 text-sm text-ada-text-muted">{plan.concurrency} concurrent generations</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 font-mono text-xs ${accentClass(plan.accent)}`}>
                        {plan.monthlyCredits.toLocaleString()} cr
                      </span>
                    </div>
                    <div className="mt-5">
                      <span className="text-4xl font-semibold">${(plan.priceCents / 100).toFixed(2)}</span>
                      <span className="text-ada-text-muted"> / month</span>
                    </div>
                    <ul className="mt-5 grid gap-3 text-sm text-ada-text-muted">
                      {plan.highlights.map((highlight) => (
                        <li key={highlight} className="border-l border-[color:var(--color-ada-line)] pl-3">{highlight}</li>
                      ))}
                    </ul>
                    <CheckoutButton plan={plan} featured={id === 'standard'} />
                  </article>
                </HudFrame>
              );
            })}
          </div>
        </section>

        <HudFrame>
          <section className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Quota matrix</h2>
                <p className="text-sm text-ada-text-muted">Approximate generations per monthly grant.</p>
              </div>
              <span className="font-mono text-xs text-ada-cyan-400">1 credit = $0.0001</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--color-ada-line)] text-xs uppercase text-ada-blue-400">
                    <th className="py-3 pr-4">Media</th>
                    <th className="py-3 pr-4">Tier</th>
                    <th className="py-3 pr-4">Unit</th>
                    {ORDERED_PLAN_IDS.map((id) => (
                      <th key={id} className="py-3 pr-4">{PLANS[id].name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kindOrder.flatMap((kind) =>
                    tierOrder.map((tier) => {
                      const price = unitPrices[`${kind}:${tier}`] ?? 1;
                      return (
                        <tr key={`${kind}:${tier}`} className="border-b border-[color:var(--color-ada-line-quiet)]">
                          <td className="py-3 pr-4 capitalize">{kind}</td>
                          <td className="py-3 pr-4 capitalize">{tier.replace('_', ' ')}</td>
                          <td className="py-3 pr-4 font-mono text-ada-text-muted">{price.toLocaleString()} cr</td>
                          {ORDERED_PLAN_IDS.map((id) => (
                            <td key={id} className="py-3 pr-4 font-mono text-ada-text">
                              ~{Math.floor(PLANS[id].monthlyCredits / price).toLocaleString()}
                            </td>
                          ))}
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </HudFrame>

        <HudFrame tone="active" brackets>
          <section className="grid gap-4 p-5">
            <div>
              <h2 className="text-xl font-semibold">Payment routing</h2>
              <p className="mt-2 text-sm text-ada-text-muted">
                Each simulated subscription records a 50% owner-wallet allocation and a 50%
                provider-pool allocation. The provider pool is the budget behind the shared API key
                that fans out to every model adapter.
              </p>
            </div>
          </section>
        </HudFrame>
      </div>
    </main>
  );
}

function buildUnitPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const model of MODELS) {
    prices[`${model.kind}:${model.tier}`] = model.priceCredits;
  }
  return prices;
}

function accentClass(accent: string): string {
  switch (accent) {
    case 'cyan':
      return 'border-ada-cyan-400 text-ada-cyan-400';
    case 'purple':
      return 'border-ada-tier-pro text-ada-tier-pro';
    case 'magenta':
      return 'border-ada-tier-max text-ada-tier-max';
    default:
      return 'border-ada-blue-400 text-ada-blue-400';
  }
}
