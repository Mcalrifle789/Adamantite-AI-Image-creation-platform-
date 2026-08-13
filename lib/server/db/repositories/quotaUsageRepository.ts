import 'server-only';

import type { QuotaUsageRow } from '../schema';
import type { Store } from '../store';

/**
 * data-model.md §3.8. PK `(user_id, period_start)`. **This table is a cache and nothing depends
 * on it for correctness** — it exists so `GET /api/credits` doesn't sum the whole ledger on
 * every request, and it is fully rebuildable from `credit_ledger` at any time (that rebuild
 * function, `rebuildQuotaUsage`, is `lib/server/credits/**` — a later task; this repository only
 * provides the storage it reads and writes).
 */
export interface QuotaUsageRepository {
  find(userId: string, periodStart: string): Promise<QuotaUsageRow | null>;
  /** Insert-or-replace on the `(user_id, period_start)` primary key. */
  upsert(row: QuotaUsageRow): Promise<QuotaUsageRow>;
  listByUser(userId: string): Promise<QuotaUsageRow[]>;
}

export function createQuotaUsageRepository(store: Store): QuotaUsageRepository {
  return {
    async find(userId, periodStart) {
      const rows = await store.read<QuotaUsageRow>('quota_usage');
      return (
        rows.find((row) => row.user_id === userId && row.period_start === periodStart) ?? null
      );
    },

    async upsert(row) {
      await store.mutate<QuotaUsageRow>('quota_usage', (rows) => {
        const index = rows.findIndex(
          (existing) => existing.user_id === row.user_id && existing.period_start === row.period_start,
        );
        if (index === -1) return [...rows, row];
        const next = [...rows];
        next[index] = row;
        return next;
      });
      return row;
    },

    async listByUser(userId) {
      const rows = await store.read<QuotaUsageRow>('quota_usage');
      return rows.filter((row) => row.user_id === userId);
    },
  };
}
