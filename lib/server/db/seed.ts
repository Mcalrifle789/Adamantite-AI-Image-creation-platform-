import 'server-only';

import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { PLANS } from '../../../config/plans';
import { newId } from '../../shared/ids';
import type { Clock } from '../clock';
import { systemClock } from '../clock';
import { env } from '../env';
import { DEFAULT_DATA_DIR, JsonStore, resolveDataDir } from './jsonStore';
import type { LedgerRow, ProjectRow, SubscriptionRow, UserRow } from './schema';
import type { Store } from './store';

/**
 * data-model.md §5. Runs on first boot when `.data/` is empty. **Idempotent and clock-free**:
 * the caller supplies both `store` and `clock` (architecture.md §3.1's testability rule), so a
 * test exercises this against a `MemoryStore` and a `fixedClock` and gets a byte-for-byte
 * reproducible seed — nothing here calls `Date.now()` or reads `.data/` on disk directly.
 */
export interface SeedResult {
  /** `false` when the store already had rows and this call was a no-op. */
  seeded: boolean;
  userId: string | null;
  projectId: string | null;
}

/** `subscriptions.current_period_end` = "start + 1 calendar month" (data-model.md §3.2), computed
 * in UTC so the boundary is unambiguous regardless of the host machine's local timezone. */
function currentCalendarMonth(now: Date): { start: string; end: string } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Seeds exactly the fixture data-model.md §5 specifies:
 * - one demo user `Explorer`, `email: null`
 * - one `port`-plan subscription for the current calendar month
 * - one `grant` ledger entry of `PLANS.port.monthlyCredits` (39,950) credits, `reason:
 *   'period_rollover'`
 * - one project `"First light"` with `initial_prompt` set and **no** generations
 *
 * Never runs when the `users` table already has rows — that is the whole idempotency contract.
 */
export async function runSeed(store: Store, clock: Clock): Promise<SeedResult> {
  const existingUsers = await store.read<UserRow>('users');
  if (existingUsers.length > 0) {
    return { seeded: false, userId: null, projectId: null };
  }

  const now = clock.now().toISOString();
  const period = currentCalendarMonth(clock.now());

  const user: UserRow = {
    id: newId('usr'),
    display_name: 'Explorer',
    email: null,
    created_at: now,
    updated_at: now,
  };
  await store.mutate<UserRow>('users', (rows) => [...rows, user]);

  const subscription: SubscriptionRow = {
    id: newId('sub'),
    user_id: user.id,
    plan_id: 'port',
    status: 'active',
    current_period_start: period.start,
    current_period_end: period.end,
    created_at: now,
    updated_at: now,
  };
  await store.mutate<SubscriptionRow>('subscriptions', (rows) => [...rows, subscription]);

  const grantCredits = PLANS.port.monthlyCredits;
  const ledgerEntry: LedgerRow = {
    id: newId('led'),
    user_id: user.id,
    period_start: period.start,
    kind: 'grant',
    delta_credits: grantCredits,
    balance_after: grantCredits,
    reason: 'period_rollover',
    generation_id: null,
    idempotency_key: null,
    created_at: now,
  };
  await store.mutate<LedgerRow>('credit_ledger', (rows) => [...rows, ledgerEntry]);

  const project: ProjectRow = {
    id: newId('prj'),
    user_id: user.id,
    name: 'First light',
    status: 'active',
    default_model_id: null,
    initial_prompt: 'A slow drift of cyan light through a rain-streaked window.',
    cover_asset_id: null,
    duplicated_from_id: null,
    created_at: now,
    updated_at: now,
    trashed_at: null,
  };
  await store.mutate<ProjectRow>('projects', (rows) => [...rows, project]);

  return { seeded: true, userId: user.id, projectId: project.id };
}

// ---------------------------------------------------------------------------
// CLI entrypoint — `npm run seed:reset` invokes `node lib/server/db/seed.ts --reset`.
// Everything above this line is pure library code exercised by `tests/server/db/seed.test.ts`
// against a `MemoryStore`; everything below only runs when this file is executed directly.
// ---------------------------------------------------------------------------

/** `--reset` wipes the resolved data directory before reseeding. Deliberately raw `fs`, not a
 * `Store` method — a full-directory wipe is a CLI/ops concern, not a table operation any
 * repository or service should ever be able to invoke. Exported for
 * `tests/server/db/seed.test.ts`. */
export async function wipeDataDir(dataDir: string): Promise<void> {
  await fs.rm(dataDir, { recursive: true, force: true });
}

/** The `npm run seed:reset` entrypoint's body. Exported (rather than only reachable via the
 * `invokedDirectly` guard below) so `tests/server/db/seed.test.ts` can exercise the NODE_ENV
 * guard without spawning a subprocess. */
export async function main(): Promise<void> {
  // NODE_ENV is a Node/Next.js platform convention outside `lib/server/env.ts`'s schema (that
  // schema deliberately omits it — see api-contract.md §3.2, which checks it the same direct
  // way for the dev-only `POST /api/session` route). `ADAMANTITE_DATA_DIR` goes through `env.ts`
  // as required everywhere else.
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[seed] refusing to run: NODE_ENV=production (data-model.md §5 — seeding is a dev-only convenience).',
    );
    process.exitCode = 1;
    return;
  }

  const shouldReset = process.argv.includes('--reset');
  const dataDir = resolveDataDir(env.ADAMANTITE_DATA_DIR ?? DEFAULT_DATA_DIR);

  if (shouldReset) {
    await wipeDataDir(dataDir);
    console.log(`[seed] wiped ${dataDir}`);
  }

  const store = new JsonStore(dataDir);
  const result = await runSeed(store, systemClock);

  console.log(
    result.seeded
      ? `[seed] seeded demo user ${result.userId} and project ${result.projectId}.`
      : '[seed] rows already exist — no-op.',
  );
}

const invokedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  });
}
