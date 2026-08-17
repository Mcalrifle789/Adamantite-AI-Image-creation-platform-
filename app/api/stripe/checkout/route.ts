import { NextResponse } from 'next/server';
import { z } from 'zod';

import { PLANS } from '@/config/plans';
import { getStripeSplitConfig, splitCents } from '@/lib/server/billing/stripe';
import type { PlanId } from '@/lib/shared/api-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  planId: z.enum(['port', 'standard', 'pro', 'max']),
  period: z.enum(['monthly', 'annual']).default('monthly'),
});

// Annual billing charges 10 months up front (2 months free).
const ANNUAL_MONTHS_CHARGED = 10;

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'planId must be one of port, standard, pro, max.' } },
      { status: 400 },
    );
  }

  const planId = parsed.data.planId as PlanId;
  const period = parsed.data.period;
  const plan = PLANS[planId];
  const chargeCents = period === 'annual' ? plan.priceCents * ANNUAL_MONTHS_CHARGED : plan.priceCents;

  try {
    const { stripe, siteUrl, ownerAccountId, providerAccountId } = getStripeSplitConfig();
    const split = splitCents(chargeCents);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${siteUrl}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: chargeCents,
            product_data: {
              name: `Adamantite ${plan.name} · ${period === 'annual' ? 'Annual' : 'Monthly'}`,
              description:
                period === 'annual'
                  ? `${plan.monthlyCredits.toLocaleString()} credits / month · billed yearly (2 months free).`
                  : `${plan.monthlyCredits.toLocaleString()} credits for image and video generation.`,
            },
          },
        },
      ],
      metadata: {
        planId: plan.id,
        planName: plan.name,
        period,
        ownerCents: String(split.ownerCents),
        providerCents: String(split.providerCents),
        ownerAccountId: ownerAccountId ?? '',
        providerAccountId: providerAccountId ?? '',
      },
      payment_intent_data: {
        metadata: {
          planId: plan.id,
          ownerCents: String(split.ownerCents),
          providerCents: String(split.providerCents),
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'STRIPE_NOT_CONFIGURED',
          message: error instanceof Error ? error.message : 'Stripe checkout could not be started.',
        },
      },
      { status: 503 },
    );
  }
}
