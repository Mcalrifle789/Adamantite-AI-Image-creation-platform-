import Link from 'next/link';

import { ORDERED_PLAN_IDS, PLANS } from '@/config/plans';
import { AccountMenu } from '@/components/account/AccountMenu';
import { Wordmark } from '@/components/brand/Wordmark';
import { PricingCards, type PricingPlan } from '@/components/billing/PricingCards';

// Marketing bullets, written to ADR-03's numbers (kept short to match the subscription art).
const HIGHLIGHTS: Record<string, string[]> = {
  port: ['~67 image generations', '3–4 5s video generations'],
  standard: ['~133 image generations', '5–8 5s video generations'],
  pro: ['~250 image generations', '10–15 5s video generations'],
  max: ['~833 image generations', '33–50 video generations · 5s videos'],
};

const plans: PricingPlan[] = ORDERED_PLAN_IDS.map((id) => {
  const plan = PLANS[id];
  return {
    id: plan.id,
    name: plan.name,
    priceCents: plan.priceCents,
    monthlyCredits: plan.monthlyCredits,
    accent: plan.accent,
    highlights: HIGHLIGHTS[id] ?? [],
  };
});

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden px-4 pb-16 pt-6 text-ada-text sm:px-8">
      <div className="relative mx-auto flex max-w-[118rem] flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <Link href="/" aria-label="Adamantite home" className="inline-flex">
            <Wordmark size="hero" withAgent as="span" className="!text-[clamp(3rem,7vw,6rem)]" />
          </Link>
          <div className="mt-4 flex items-center gap-5">
            <Link
              href="/"
              className="text-2xl text-ada-text underline decoration-white/40 underline-offset-8 drop-shadow-[0_0_14px_rgb(255_255_255_/_0.45)] transition duration-[var(--dur-3)] hover:text-ada-cyan-300"
            >
              Go back
            </Link>
            <AccountMenu showName={false} />
          </div>
        </header>

        <PricingCards plans={plans} />
      </div>
    </main>
  );
}
