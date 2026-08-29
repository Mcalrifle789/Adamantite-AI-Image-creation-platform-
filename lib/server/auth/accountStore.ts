import 'server-only';

import { isProduction, loadAuthEnv } from './authEnv';
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
  __adamantiteAccountStoreWarned?: boolean;
};

export function getAccountStore(): AccountStore {
  if (!globalForAccountStore.__adamantiteAccountStore) {
    const { DATABASE_URL } = loadAuthEnv();

    if (DATABASE_URL) {
      globalForAccountStore.__adamantiteAccountStore = createPostgresAccountStore(DATABASE_URL);
    } else {
      if (isProduction() && !globalForAccountStore.__adamantiteAccountStoreWarned) {
        globalForAccountStore.__adamantiteAccountStoreWarned = true;
        console.warn(
          '[adamantite/auth] DATABASE_URL is not set. Accounts are falling back to the JSON file ' +
            'store, which CANNOT persist on Vercel (read-only, per-invocation filesystem). ' +
            'Attach a Postgres database and set DATABASE_URL to make sign-up durable.',
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
