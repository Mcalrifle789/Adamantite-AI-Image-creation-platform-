import 'server-only';

import { z } from 'zod';

/**
 * The only place in the codebase allowed to read `process.env` — architecture.md §9 ("Config").
 * Parsed once, at module load, through this schema; throws immediately if a required var is
 * missing so a misconfigured deploy fails at startup, not on the first request.
 *
 * `ADAMANTITE_DATA_DIR` and `ADAMANTITE_PROVIDER_API_KEY` are left as plain optional strings —
 * their "defaults" are behavioural (a default data directory, a MOCK sentinel) and belong to the
 * server modules that consume them (`lib/server/db`, `lib/server/providers`), not to this
 * schema. `MOCK_LATENCY_SCALE` and `MOCK_FAILURE_RATE` have concrete numeric defaults
 * (architecture.md §5.1), so they are baked in here — every consumer gets a real number, never
 * `undefined`.
 */
const envSchema = z.object({
  /** Signs and verifies the `ada_session` cookie (HMAC). No default — required. */
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),

  /** Overrides the JSON-file data directory. Default (applied by lib/server/db): `.data`. */
  ADAMANTITE_DATA_DIR: z.string().min(1).optional(),

  /** The shared upstream model-provider API key. Unset in M1 — the mock adapter does not need it. */
  ADAMANTITE_PROVIDER_API_KEY: z.string().min(1).optional(),

  /** Multiplies every mock generation's queued/running duration. Default: 1. */
  MOCK_LATENCY_SCALE: z.coerce.number().nonnegative().default(1),

  /** Probability (0..1) that a mock generation is deterministically failed. Default: 0. */
  MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
