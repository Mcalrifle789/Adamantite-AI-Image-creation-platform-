import Link from 'next/link';

import { ORDERED_PLAN_IDS, PLANS } from '@/config/plans';
import { Wordmark } from '@/components/brand/Wordmark';
import { CheckoutButton } from '@/components/billing/CheckoutButton';

// Per-tier neon border variant + nebula interior wash, matching the subscription mockup:
// Port = blue, Standard = teal, Pro = purple, Max = magenta.
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

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden px-4 pb-16 pt-6 text-ada-text sm:px-8">
      <div className="relative mx-auto flex max-w-[118rem] flex-col gap-10">
        <header className="flex items-start justify-between gap-4">
          <Link href="/" aria-label="Adamantite home" className="inline-flex">
            <Wordmark size="hero" withAgent as="span" className="!text-[clamp(3rem,7vw,6rem)]" />
          </Link>
          <Link
            href="/"
            className="mt-4 text-2xl text-ada-text underline decoration-white/40 underline-offset-8 drop-shadow-[0_0_14px_rgb(255_255_255_/_0.45)] transition duration-[var(--dur-3)] hover:text-ada-cyan-300"
          >
            Go back
          </Link>
        </header>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {ORDERED_PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            const style = (TIER_STYLE[id] ?? TIER_STYLE.port)!;
            return (
              <article
                key={id}
                className={`${style.frame} min-h-[38rem] overflow-hidden p-8 transition duration-[var(--dur-3)] ease-[var(--ease-out)] hover:-translate-y-2`}
              >
                <div className="pointer-events-none absolute inset-0 opacity-90" style={{ backgroundImage: style.nebula }} />
                <div className="relative z-10 flex h-full flex-col">
                  <h2 className="text-[clamp(2.6rem,3.6vw,4rem)] font-bold leading-none text-white drop-shadow-[0_4px_14px_rgb(0_0_0_/_0.7)]">
                    {plan.name}
                  </h2>
                  <div className="mt-6">
                    <span className={`text-[clamp(2.2rem,3vw,3.4rem)] font-semibold ${style.price} drop-shadow-[0_0_18px_rgb(34_211_238_/_0.6)]`}>
                      ${(plan.priceCents / 100).toFixed(2)}
                    </span>
                    <span className="ml-1 text-2xl text-ada-cyan-300/90">/month</span>
                  </div>
                  <p className="mt-2 text-sm text-white/55">+ sales tax, calculated at checkout</p>
                  <div className="mt-5 h-px w-full bg-[rgb(120_205_255_/_0.5)] shadow-[0_0_14px_1px_rgb(60_170_255_/_0.6)]" />
                  <ul className="mt-7 grid gap-4 text-lg text-white/90">
                    {planHighlights(id).map((highlight) => (
                      <li key={highlight} className="flex gap-3">
                        <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <CheckoutButton plan={plan} featured={id === 'standard'} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function planHighlights(planId: string): string[] {
  switch (planId) {
    case 'port':
      return ['~67 image generations', '3–4 5s video generations'];
    case 'standard':
      return ['~133 image generations', '5–8 5s video generations'];
    case 'pro':
      return ['~250 image generations', '10–15 5s video generations'];
    case 'max':
      return ['~833 image generations', '33–50 video generations · 5s videos'];
    default:
      return [];
  }
}
