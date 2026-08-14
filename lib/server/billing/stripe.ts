import 'server-only';

import Stripe from 'stripe';

import { loadRuntimeEnv, type Env } from '../runtimeEnv';

export interface StripeSplitConfig {
  stripe: Stripe;
  ownerAccountId: string;
  providerAccountId: string;
  siteUrl: string;
  /** Whether to collect sales tax at checkout via Stripe Tax. */
  taxEnabled: boolean;
  /** Optional Stripe product tax code; undefined uses the account default. */
  taxCode?: string;
}

export function getStripeSplitConfig(): StripeSplitConfig {
  const env = loadRuntimeEnv();
  const missing = [
    ['STRIPE_SECRET_KEY', env.STRIPE_SECRET_KEY],
    ['OWNER_STRIPE_CONNECTED_ACCOUNT_ID', env.OWNER_STRIPE_CONNECTED_ACCOUNT_ID],
    ['PROVIDER_STRIPE_CONNECTED_ACCOUNT_ID', env.PROVIDER_STRIPE_CONNECTED_ACCOUNT_ID],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Stripe payments are not configured. Missing: ${missing.join(', ')}`);
  }

  return {
    stripe: new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-07-29.dahlia',
      appInfo: {
        name: 'Adamantite Agent',
      },
    }),
    ownerAccountId: env.OWNER_STRIPE_CONNECTED_ACCOUNT_ID!,
    providerAccountId: env.PROVIDER_STRIPE_CONNECTED_ACCOUNT_ID!,
    siteUrl: resolveSiteUrl(),
    taxEnabled: env.STRIPE_TAX_ENABLED,
    taxCode: env.STRIPE_TAX_CODE,
  };
}

export function resolveSiteUrl(): string {
  const env = loadRuntimeEnv();
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, '');
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export function getStripeWebhookConfig(): StripeSplitConfig & { webhookSecret: string } {
  const env = loadRuntimeEnv();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook is not configured. Missing: STRIPE_WEBHOOK_SECRET');
  }

  return {
    ...getStripeSplitConfig(),
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  };
}

export function resolveSiteUrlFromEnv(env: Env): string {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, '');
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export function splitCents(amountCents: number): { ownerCents: number; providerCents: number } {
  const ownerCents = Math.floor(amountCents / 2);
  return {
    ownerCents,
    providerCents: amountCents - ownerCents,
  };
}
