import 'server-only';

import { RepositoryNotFoundError, UniqueConstraintViolationError } from '../errors';
import type { SubscriptionRow } from '../schema';
import type { Store } from '../store';

/** data-model.md §3.2: `UNIQUE(user_id)` — exactly one subscription per user in M1. Never
 * deleted; `POST /api/subscription` mutates `plan_id` via `update`. */
export interface SubscriptionRepository {
  create(row: SubscriptionRow): Promise<SubscriptionRow>;
  findByUserId(userId: string): Promise<SubscriptionRow | null>;
  update(userId: string, patch: Partial<SubscriptionRow>): Promise<SubscriptionRow>;
}

export function createSubscriptionRepository(store: Store): SubscriptionRepository {
  return {
    async create(row) {
      await store.mutate<SubscriptionRow>('subscriptions', (rows) => {
        const conflict = rows.some((existing) => existing.user_id === row.user_id);
        if (conflict) {
          throw new UniqueConstraintViolationError('subscriptions', 'UNIQUE(user_id)');
        }
        return [...rows, row];
      });
      return row;
    },

    async findByUserId(userId) {
      const rows = await store.read<SubscriptionRow>('subscriptions');
      return rows.find((row) => row.user_id === userId) ?? null;
    },

    async update(userId, patch) {
      let updated: SubscriptionRow | undefined;
      await store.mutate<SubscriptionRow>('subscriptions', (rows) =>
        rows.map((row) => {
          if (row.user_id !== userId) return row;
          updated = { ...row, ...patch };
          return updated;
        }),
      );
      if (!updated) throw new RepositoryNotFoundError('subscriptions', userId);
      return updated;
    },
  };
}
