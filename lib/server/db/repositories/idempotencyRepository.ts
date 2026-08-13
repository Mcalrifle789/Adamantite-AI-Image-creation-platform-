import 'server-only';

import { UniqueConstraintViolationError } from '../errors';
import type { IdempotencyRow } from '../schema';
import type { Store } from '../store';

/**
 * data-model.md §3.9. PK `(user_id, key)`. Retention is 24h, "swept opportunistically on write"
 * — this repository stays clock-free (nothing here calls `Date.now()`), so the caller computes
 * the cutoff with its injected `Clock` and passes it to {@link IdempotencyRepository.deleteOlderThan}.
 */
export interface IdempotencyRepository {
  find(userId: string, key: string): Promise<IdempotencyRow | null>;
  /** Throws {@link UniqueConstraintViolationError} if `(user_id, key)` already exists — the
   * caller is expected to `find` first and compare `request_hash` to decide between "replay the
   * stored response" and `409 IDEMPOTENCY_KEY_REUSED` (api-contract.md §1); this method only
   * guards the primary key itself. */
  create(row: IdempotencyRow): Promise<IdempotencyRow>;
  /** Removes every row with `created_at < cutoffIso` and returns the count removed. */
  deleteOlderThan(cutoffIso: string): Promise<number>;
}

export function createIdempotencyRepository(store: Store): IdempotencyRepository {
  return {
    async find(userId, key) {
      const rows = await store.read<IdempotencyRow>('idempotency');
      return rows.find((row) => row.user_id === userId && row.key === key) ?? null;
    },

    async create(row) {
      await store.mutate<IdempotencyRow>('idempotency', (rows) => {
        const conflict = rows.some(
          (existing) => existing.user_id === row.user_id && existing.key === row.key,
        );
        if (conflict) {
          throw new UniqueConstraintViolationError('idempotency', 'PK(user_id, key)');
        }
        return [...rows, row];
      });
      return row;
    },

    async deleteOlderThan(cutoffIso) {
      let removed = 0;
      await store.mutate<IdempotencyRow>('idempotency', (rows) => {
        const kept = rows.filter((row) => row.created_at >= cutoffIso);
        removed = rows.length - kept.length;
        return kept;
      });
      return removed;
    },
  };
}
