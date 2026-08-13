import 'server-only';

import type { TableName } from './schema';

/** On-disk shape of every table file: `{ version: 1, rows: Row[] }` (data-model.md §1). */
export interface TableFile<TRow> {
  version: 1;
  rows: TRow[];
}

/**
 * The migration seam (ADR-01, data-model.md §1.1). `JsonStore` and `MemoryStore` are the only
 * two implementations in M1; a future `PrismaStore` implements the same interface and
 * `createRepositories()` in `index.ts` does not change.
 *
 * Both methods are async and both are queued through a single in-process promise queue per
 * store instance, so two concurrent mutations against the same store can never interleave —
 * that is what makes the read-check-write sequences in `lib/server/credits/**` (T-006) safe
 * without a database transaction.
 */
export interface Store {
  /** Returns the current rows for `table`. Never mutate the returned array in place — treat it
   * as a snapshot; `mutate()` is the only sanctioned write path. */
  read<TRow>(table: TableName): Promise<TRow[]>;

  /**
   * Runs `fn` against the current rows for `table` and persists whatever it returns as the new
   * table contents, atomically and serialized with respect to every other `mutate()`/`read()`
   * call on this store instance. `fn` may throw (e.g. a CHECK or UNIQUE violation) — in that
   * case nothing is written and the table is left exactly as it was.
   */
  mutate<TRow>(table: TableName, fn: (rows: TRow[]) => TRow[]): Promise<TRow[]>;
}

/** `credit_ledger` is the one table whose file name (data-model.md §1: `ledger.json`) does not
 * match its table name (§3.7: `credit_ledger`) — recorded once, here, rather than repeated. */
export const TABLE_FILE_NAMES: Record<TableName, string> = {
  users: 'users.json',
  subscriptions: 'subscriptions.json',
  projects: 'projects.json',
  generations: 'generations.json',
  assets: 'assets.json',
  messages: 'messages.json',
  credit_ledger: 'ledger.json',
  quota_usage: 'quota_usage.json',
  idempotency: 'idempotency.json',
};
