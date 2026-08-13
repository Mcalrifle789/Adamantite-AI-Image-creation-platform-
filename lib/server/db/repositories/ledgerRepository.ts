import 'server-only';

import type { LedgerEntryKind } from '../../../shared/api-types';
import { LedgerConflictError } from '../errors';
import { paginate, type Page } from '../pagination';
import type { LedgerRow } from '../schema';
import type { Store } from '../store';

export interface ListLedgerQuery {
  periodStart?: string;
  cursor?: string;
  limit: number;
}

/**
 * data-model.md §4 (given verbatim there as the worked example) and §3.7. **Append-only,
 * structurally**: this interface has no `update` and no `delete` — ADR-04's guarantee ("no row
 * is ever updated or deleted; corrections are new compensating rows") is enforced by what this
 * type does not let a caller do, not by caller discipline.
 */
export interface LedgerRepository {
  /**
   * Enforces `UNIQUE(user_id, generation_id, kind)` (data-model.md §3.7 — the double-charge
   * guard, ADR-04) and throws {@link LedgerConflictError} on violation. Per ordinary SQL NULL
   * semantics, a `null` `generation_id` (e.g. `grant`/`expire` entries, which are not tied to a
   * single generation) never collides with another `null` — only entries that share the same
   * non-null `generation_id` and `kind` for the same user are checked.
   */
  append(entry: LedgerRow): Promise<LedgerRow>;
  /** The `(user_id, period_start, created_at)` index path — the balance sum. */
  sumForPeriod(userId: string, periodStart: string): Promise<number>;
  list(userId: string, query: ListLedgerQuery): Promise<Page<LedgerRow>>;
  hasEntry(userId: string, generationId: string, kind: LedgerEntryKind): Promise<boolean>;
}

export function createLedgerRepository(store: Store): LedgerRepository {
  return {
    async append(entry) {
      await store.mutate<LedgerRow>('credit_ledger', (rows) => {
        if (entry.generation_id !== null) {
          const conflict = rows.some(
            (row) =>
              row.user_id === entry.user_id &&
              row.generation_id === entry.generation_id &&
              row.kind === entry.kind,
          );
          if (conflict) {
            throw new LedgerConflictError(entry.user_id, entry.generation_id, entry.kind);
          }
        }
        return [...rows, entry];
      });
      return entry;
    },

    async sumForPeriod(userId, periodStart) {
      const rows = await store.read<LedgerRow>('credit_ledger');
      return rows
        .filter((row) => row.user_id === userId && row.period_start === periodStart)
        .reduce((sum, row) => sum + row.delta_credits, 0);
    },

    async list(userId, query) {
      const rows = await store.read<LedgerRow>('credit_ledger');
      const scoped = rows.filter((row) => {
        if (row.user_id !== userId) return false;
        if (query.periodStart !== undefined && row.period_start !== query.periodStart) return false;
        return true;
      });
      return paginate({
        rows: scoped,
        sortKey: (row) => row.created_at,
        id: (row) => row.id,
        direction: 'desc',
        cursor: query.cursor,
        limit: query.limit,
      });
    },

    async hasEntry(userId, generationId, kind) {
      const rows = await store.read<LedgerRow>('credit_ledger');
      return rows.some(
        (row) => row.user_id === userId && row.generation_id === generationId && row.kind === kind,
      );
    },
  };
}
