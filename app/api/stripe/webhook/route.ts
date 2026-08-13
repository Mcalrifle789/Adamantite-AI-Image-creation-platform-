import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { getStripeWebhookConfig, splitCents } from '@/lib/server/billing/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  let config: ReturnType<typeof getStripeWebhookConfig>;
  try {
    config = getStripeWebhookConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stripe webhook is not configured.' },
      { status: 503 },
    );
  }

  let event: Stripe.Event;
  const rawBody = await request.text();
  try {
    event = config.stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid Stripe webhook signature.' },
      { status: 400 },
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await handleCheckoutCompleted(config, session);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(
  config: ReturnType<typeof getStripeWebhookConfig>,
  session: Stripe.Checkout.Session,
) {
  if (session.payment_status !== 'paid') return;
  if (!session.payment_intent || typeof session.payment_intent !== 'string') return;

  const grossCents = session.amount_total ?? 0;
  if (grossCents <= 0) return;

  const split = splitCents(grossCents);
  const transferGroup = `adamantite_${session.id}`;

  await Promise.all([
    config.stripe.transfers.create({
      amount: split.ownerCents,
      currency: 'usd',
      destination: config.ownerAccountId,
      transfer_group: transferGroup,
      source_transaction: undefined,
      metadata: {
        checkoutSessionId: session.id,
        split: 'owner_wallet',
        planId: session.metadata?.planId ?? '',
      },
    }),
    config.stripe.transfers.create({
      amount: split.providerCents,
      currency: 'usd',
      destination: config.providerAccountId,
      transfer_group: transferGroup,
      source_transaction: undefined,
      metadata: {
        checkoutSessionId: session.id,
        split: 'provider_pool',
        planId: session.metadata?.planId ?? '',
      },
    }),
  ]);
}
