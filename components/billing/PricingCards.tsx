'use client';

import { useState } from 'react';

import { CheckoutButton } from '@/components/billing/CheckoutButton';
import type { WalletPlan } from '@/components/billing/wallet';

export type PricingPlan = WalletPlan & { highlights: string[] };

const TIER_STYLE: Record<string, { frame: string; nebula: string; price: string }> = {
  port: {
    frame: 'neon-frame',
    nebula:
      'radial-gradient(120% 90% at 50% 120%, rgb(30 144 255 / 0.34), transparent 60%), radial-gradient(90% 60% at 80% 15%, rgb(59 130 246 / 0.2), transparent 55%)',
    price: 'text-ada-blue-300',
  },
  standard: {
    frame: 'neon-frame neon-frame--cyan',
    nebula:
      'radial-gradient(120% 90% at 50% 120%, rgb(34 211 238 / 0.3), transparent 60%), radial-gradient(90% 60% at 20% 10%, rgb(6 174 205 / 0.22), transparent 55%)',
    price: 'text-ada-cyan-300',
  },
  pro: {
    frame: 'neon-frame neon-frame--purple',
    nebula:
      'radial-gradient(120% 90% at 60% 120%, rgb(167 139 250 / 0.34), transparent 60%), radial-gradient(90% 60% at 80% 15%, rgb(139 92 246 / 0.24), transparent 55%)',
    price: 'text-ada-cyan-300',
  },
  max: {
    frame: 'neon-frame neon-frame--magenta',
    nebula:
      'radial-gradient(120% 90% at 65% 120%, rgb(244 114 182 / 0.36), transparent 60%), radial-gradient(90% 60% at 78% 18%, rgb(217 70 239 / 0.26), transparent 55%)',
    price: 'text-ada-cyan-300',
  },
};

// Annual charges 10 months up front → monthly-equivalent = price * 10 / 12.
function annualMonthly(priceCents: number): string {
  return ((priceCents * 10) / 12 / 100).toFixed(2);
}

export function PricingCards({ plans }: { plans: PricingPlan[] }) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.03] p-1 backdrop-blur-md">
          {(['monthly', 'annual'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              aria-pressed={period === option}
              className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition duration-[var(--dur-2)] ${
                period === option
                  ? 'bg-[rgb(34_211_238_/_0.16)] text-ada-cyan-100 shadow-[0_0_18px_-4px_rgb(34_211_238_/_0.85)]'
                  : 'text-ada-text-muted hover:text-ada-text'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="text-xs text-ada-cyan-200/70">
          {period === 'annual' ? 'Billed yearly — 2 months free' : 'Billed monthly — cancel anytime'}
        </p>
      </div>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const style = (TIER_STYLE[plan.id] ?? TIER_STYLE.port)!;
          const priceText = period === 'annual' ? annualMonthly(plan.priceCents) : (plan.priceCents / 100).toFixed(2);
          const walletPlan: WalletPlan = {
            id: plan.id,
            name: plan.name,
            priceCents: plan.priceCents,
            monthlyCredits: plan.monthlyCredits,
            accent: plan.accent,
          };
          return (
            <article
              key={plan.id}
              className={`${style.frame} min-h-[38rem] overflow-hidden p-8 transition duration-[var(--dur-3)] ease-[var(--ease-out)] hover:-translate-y-2`}
            >
              <div className="pointer-events-none absolute inset-0 opacity-90" style={{ backgroundImage: style.nebula }} />
              <div className="relative z-10 flex h-full flex-col">
                <h2 className="text-[clamp(2.6rem,3.6vw,4rem)] font-bold leading-none text-white drop-shadow-[0_4px_14px_rgb(0_0_0_/_0.7)]">
                  {plan.name}
                </h2>
                <div className="mt-6">
                  <span className={`text-[clamp(2.2rem,3vw,3.4rem)] font-semibold ${style.price} drop-shadow-[0_0_18px_rgb(34_211_238_/_0.6)]`}>
                    ${priceText}
                  </span>
                  <span className="ml-1 text-2xl text-ada-cyan-300/90">/month</span>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  {period === 'annual' ? 'billed yearly · + sales tax' : '+ sales tax, calculated at checkout'}
                </p>
                <div className="mt-5 h-px w-full bg-[rgb(120_205_255_/_0.5)] shadow-[0_0_14px_1px_rgb(60_170_255_/_0.6)]" />
                <ul className="mt-7 grid gap-4 text-lg text-white/90">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-3">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <CheckoutButton plan={walletPlan} featured={plan.id === 'standard'} period={period} />
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
