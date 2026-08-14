import 'server-only';

import { z } from 'zod';

/**
 * Shared runtime environment schema. `env.ts` intentionally parses it at module load for the
 * core backend; request-only integrations such as Stripe can call `loadRuntimeEnv()` lazily so a
 * static Vercel build does not fail before the route is invoked.
 */
const envSchema = z.object({
  /** Signs and verifies the `ada_session` cookie (HMAC). No default — required. */
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),

  /** Overrides the JSON-file data directory. Default (applied by lib/server/db): `.data`. */
  ADAMANTITE_DATA_DIR: z.string().min(1).optional(),

  /** The shared upstream model-provider API key. Unset in M1 — the mock adapter does not need it. */
  ADAMANTITE_PROVIDER_API_KEY: z.string().min(1).optional(),

  /** Canonical site URL for Stripe success/cancel redirects. Vercel can also supply VERCEL_URL. */
  SITE_URL: z.string().url().optional(),
  VERCEL_URL: z.string().min(1).optional(),

  /** Stripe Checkout + Connect configuration for real subscription payments and 50/50 splits. */
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  OWNER_STRIPE_CONNECTED_ACCOUNT_ID: z.string().min(1).optional(),
  PROVIDER_STRIPE_CONNECTED_ACCOUNT_ID: z.string().min(1).optional(),

  /**
   * Collect sales tax at checkout via Stripe Tax. Default: on. Requires Stripe Tax to be
   * activated in the dashboard (Settings → Tax: origin address + registrations). Set to
   * "false" to keep checkout working before Stripe Tax is configured. Tax is added on top of
   * the plan price (tax-exclusive) and stays with the platform — it is never split to the
   * connected accounts.
   */
  STRIPE_TAX_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  /** Optional Stripe product tax code (e.g. txcd_10103001 for SaaS). Falls back to the
   * account's default product tax code when unset. */
  STRIPE_TAX_CODE: z.string().min(1).optional(),

  /** Multiplies every mock generation's queued/running duration. Default: 1. */
  MOCK_LATENCY_SCALE: z.coerce.number().nonnegative().default(1),

  /** Probability (0..1) that a mock generation is deterministically failed. Default: 0. */
  MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
});

export type Env = z.infer<typeof envSchema>;

export function loadRuntimeEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return parsed.data;
}
