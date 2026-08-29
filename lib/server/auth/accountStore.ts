import 'server-only';

import { AuthConfigurationError, isProduction, loadAuthEnv } from './authEnv';
import { createJsonAccountStore } from './stores/jsonAccountStore';
import { createPostgresAccountStore } from './stores/postgresAccountStore';
import type { AccountStore } from './types';

/**
 * Picks the backing store from `DATABASE_URL` and pins it to `globalThis`, matching the
 * precedent in `lib/server/db/index.ts` — a hot reload or a warm Lambda re-entering this module
 * must not build a second store (and, for Postgres, a second connection pool).
 *
 * Local dev with no `DATABASE_URL` transparently falls back to a JSON file so `npm run dev`
 * works with zero setup. On a production deploy that fallback cannot persist anything, so it
 * warns once instead of failing silently — the symptom otherwise ("I registered, then it said
 * my account doesn't exist") is genuinely hard to diagnose from the outside.
 */
const globalForAccountStore = globalThis as unknown as {
  __adamantiteAccountStore?: AccountStore;
};

export function getAccountStore(): AccountStore {
  if (!globalForAccountStore.__adamantiteAccountStore) {
    const { DATABASE_URL } = loadAuthEnv();

    if (DATABASE_URL) {
      globalForAccountStore.__adamantiteAccountStore = createPostgresAccountStore(DATABASE_URL);
    } else {
      if (isProduction()) {
        throw new AuthConfigurationError(
          'DATABASE_URL is not set. Add your Neon Postgres connection string in Vercel ' +
            'Project Settings → Environment Variables before using sign in or registration.',
        );
      }
      globalForAccountStore.__adamantiteAccountStore = createJsonAccountStore();
    }
  }
  return globalForAccountStore.__adamantiteAccountStore;
}

/** True when accounts are backed by a database that actually survives a deploy. */
export function hasDurableAccountStorage(): boolean {
  return Boolean(loadAuthEnv().DATABASE_URL);
}

/** Resolves the store and guarantees its schema exists before the first query. */
export async function getReadyAccountStore(): Promise<AccountStore> {
  const store = getAccountStore();
  await store.init();
  return store;
}
