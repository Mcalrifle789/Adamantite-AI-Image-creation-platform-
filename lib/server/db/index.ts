import 'server-only';

import { JsonStore } from './jsonStore';
import { createAssetRepository, type AssetRepository } from './repositories/assetRepository';
import {
  createGenerationRepository,
  type GenerationRepository,
} from './repositories/generationRepository';
import {
  createIdempotencyRepository,
  type IdempotencyRepository,
} from './repositories/idempotencyRepository';
import { createLedgerRepository, type LedgerRepository } from './repositories/ledgerRepository';
import { createMessageRepository, type MessageRepository } from './repositories/messageRepository';
import { createProjectRepository, type ProjectRepository } from './repositories/projectRepository';
import {
  createQuotaUsageRepository,
  type QuotaUsageRepository,
} from './repositories/quotaUsageRepository';
import {
  createSubscriptionRepository,
  type SubscriptionRepository,
} from './repositories/subscriptionRepository';
import { createUserRepository, type UserRepository } from './repositories/userRepository';
import type { Store } from './store';

export type { Store } from './store';
export type { Page } from './pagination';
export * from './schema';
export * from './errors';

export interface Repositories {
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  projects: ProjectRepository;
  generations: GenerationRepository;
  assets: AssetRepository;
  messages: MessageRepository;
  ledger: LedgerRepository;
  quotaUsage: QuotaUsageRepository;
  idempotency: IdempotencyRepository;
}

/**
 * The migration seam named in data-model.md §1.1: flipping the persistence engine from JSON
 * files to Prisma is "implement `PrismaXRepository` etc. against the same repository interfaces
 * ... flip `createRepositories()` in `lib/server/db/index.ts` from `json` to `prisma`" — this
 * function, and only this function, knows how a `Store` becomes a `Repositories`. Every
 * repository is a thin closure over `store`; none of them read `process.env`, the clock, or a
 * global — they are exercised directly in tests by passing a `MemoryStore` here
 * (architecture.md §3.1 "Testability rule").
 */
export function createRepositories(store: Store): Repositories {
  return {
    users: createUserRepository(store),
    subscriptions: createSubscriptionRepository(store),
    projects: createProjectRepository(store),
    generations: createGenerationRepository(store),
    assets: createAssetRepository(store),
    messages: createMessageRepository(store),
    ledger: createLedgerRepository(store),
    quotaUsage: createQuotaUsageRepository(store),
    idempotency: createIdempotencyRepository(store),
  };
}

/**
 * The route-handler accessor. Pinned to `globalThis` for the same reason `JsonStore`'s read
 * cache is (data-model.md §1): Next.js dev mode re-evaluates this module on every hot reload,
 * which would otherwise construct a new `JsonStore` — and therefore a fresh, cold cache and a
 * fresh promise queue — on every save.
 */
const globalForRepositories = globalThis as unknown as {
  __adamantiteStore?: JsonStore;
  __adamantiteRepositories?: Repositories;
};

export function getRepositories(): Repositories {
  if (!globalForRepositories.__adamantiteRepositories) {
    const store = globalForRepositories.__adamantiteStore ?? new JsonStore();
    globalForRepositories.__adamantiteStore = store;
    globalForRepositories.__adamantiteRepositories = createRepositories(store);
  }
  return globalForRepositories.__adamantiteRepositories;
}
