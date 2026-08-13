import 'server-only';

import { env } from '../env';

/**
 * The sole reader of `ADAMANTITE_PROVIDER_API_KEY` — architecture.md §4. Every provider adapter,
 * mock or real, gets its key through this function and only this function; the value never lands
 * on a DTO, is never logged, and never gets a `NEXT_PUBLIC_` name.
 *
 * In M1 the mock adapter does not need a key, but it still calls this accessor (see
 * `mock/mockProvider.ts`'s `submit`) so the real code path a future adapter uses is exercised
 * from day one, rather than discovered broken when a real provider lands.
 */

export const MOCK_CREDENTIALS_SENTINEL = 'MOCK' as const;

export interface ProviderCredentials {
  apiKey: string;
  /** `true` when no real key is configured — the day-to-day case in M1. */
  isMock: boolean;
}

export function getProviderCredentials(): ProviderCredentials {
  const apiKey = env.ADAMANTITE_PROVIDER_API_KEY;

  if (!apiKey) {
    return { apiKey: MOCK_CREDENTIALS_SENTINEL, isMock: true };
  }

  return { apiKey, isMock: false };
}
