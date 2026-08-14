import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
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
    const { stripe, siteUrl, ownerAccountId, providerAccountId, taxEnabled, taxCode } =
      getStripeSplitConfig();
    const split = splitCents(chargeCents);

    // Build the session params. `withTax` layers Stripe Tax on top; if the account has not
    // activated Stripe Tax yet, session creation fails and we transparently retry without it so
    // the "Choose plan" button never breaks in production.
    const buildParams = (withTax: boolean): Stripe.Checkout.SessionCreateParams => ({
      mode: 'payment',
      success_url: `${siteUrl}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      ...(withTax
        ? { automatic_tax: { enabled: true }, billing_address_collection: 'required' as const }
        : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: chargeCents,
            ...(withTax ? { tax_behavior: 'exclusive' as const } : {}),
            product_data: {
              name: `Adamantite ${plan.name} · ${period === 'annual' ? 'Annual' : 'Monthly'}`,
              description:
                period === 'annual'
                  ? `${plan.monthlyCredits.toLocaleString()} credits / month · billed yearly (2 months free).`
                  : `${plan.monthlyCredits.toLocaleString()} credits for image and video generation.`,
              ...(withTax && taxCode ? { tax_code: taxCode } : {}),
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
        ownerAccountId,
        providerAccountId,
      },
      payment_intent_data: {
        metadata: {
          planId: plan.id,
          ownerCents: String(split.ownerCents),
          providerCents: String(split.providerCents),
        },
      },
    });

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(buildParams(taxEnabled));
    } catch (error) {
      if (taxEnabled && isTaxNotConfiguredError(error)) {
        // Stripe Tax isn't set up in the dashboard yet — fall back to a taxless session.
        session = await stripe.checkout.sessions.create(buildParams(false));
      } else {
        throw error;
      }
    }

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

/** True when Stripe rejects a session because Stripe Tax / automatic_tax isn't configured on the
 * account, so the caller can retry without tax rather than surfacing a broken checkout. */
function isTaxNotConfiguredError(error: unknown): boolean {
  const raw = error as { param?: unknown; message?: unknown } | null;
  const param = typeof raw?.param === 'string' ? raw.param : '';
  const message = typeof raw?.message === 'string' ? raw.message.toLowerCase() : '';
  return (
    param.includes('automatic_tax') ||
    message.includes('automatic_tax') ||
    (message.includes('tax') &&
      (message.includes('origin address') ||
        message.includes('not been configured') ||
        message.includes('not configured') ||
        message.includes('activate') ||
        message.includes('enable stripe tax') ||
        message.includes('tax settings')))
  );
}
