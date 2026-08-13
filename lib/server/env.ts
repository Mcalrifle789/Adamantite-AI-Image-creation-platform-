import 'server-only';

import { loadRuntimeEnv, type Env } from './runtimeEnv';

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
export type { Env };

export const env: Env = loadRuntimeEnv();
