import 'server-only';

import { z } from 'zod';

/**
 * Auth-only env subset, loaded lazily and deliberately independent of `lib/server/env.ts`'s
 * strict schema — the same precedent `loadStripeEnv()` sets in `runtimeEnv.ts`: signing in must
 * not fail because an unrelated provider key is missing, and a static Vercel build must not
 * explode at module-evaluation time before any request has arrived.
 *
 * `DATABASE_URL` is the single switch that decides where accounts live:
 * - set   → Postgres (Neon / Vercel Postgres / Supabase / any Postgres). The only option that
 *           actually persists on Vercel, whose filesystem is read-only and per-invocation.
 * - unset → the JSON-file store under `E:\Adamantite\Database` (local development only).
 */
const authEnvSchema = z.object({
  AUTH_SECRET: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  /** Set to '1' to force `ssl: { rejectUnauthorized: false }` for providers with self-signed certs. */
  DATABASE_SSL_NO_VERIFY: z.string().min(1).optional(),
  NODE_ENV: z.string().min(1).optional(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigurationError';
  }
}

export function loadAuthEnv(): AuthEnv {
  const parsed = authEnvSchema.safeParse(process.env);
  return parsed.success ? parsed.data : ({} as AuthEnv);
}

/**
 * The HMAC key for the `ada_session` cookie. Throws rather than falling back to a constant: a
 * predictable signing key means anyone can forge a session, so a missing `AUTH_SECRET` has to be
 * a loud 500 at request time, not a silent downgrade.
 */
export function requireAuthSecret(): string {
  const { AUTH_SECRET } = loadAuthEnv();
  if (!AUTH_SECRET) {
    throw new AuthConfigurationError(
      'AUTH_SECRET is not set. Generate one with `openssl rand -hex 32` and add it to your ' +
        'environment (Vercel → Settings → Environment Variables) before using accounts.',
    );
  }
  return AUTH_SECRET;
}

export function isProduction(): boolean {
  return loadAuthEnv().NODE_ENV === 'production';
}
