import 'server-only';

import type { TableName } from './schema';
import type { Store } from './store';

/**
 * In-memory implementation of {@link Store}, no filesystem access — for tests
 * (architecture.md §3.1's "Testability rule": services and repositories are exercised against
 * this, never a real `JsonStore`, so the suite never touches disk and never leaves `.data/`
 * artifacts behind).
 *
 * Implements the identical serialization contract as `JsonStore` — every `read`/`mutate` call is
 * queued through one in-process promise chain — so a test asserting "two interleaved mutations
 * produce a consistent final state" exercises the same guarantee the real store makes, just
 * without the disk I/O.
 */
export class MemoryStore implements Store {
  private readonly tables = new Map<TableName, unknown[]>();
  private queue: Promise<unknown> = Promise.resolve();

  async read<TRow>(table: TableName): Promise<TRow[]> {
    return this.enqueue(() => this.snapshot<TRow>(table));
  }

  async mutate<TRow>(table: TableName, fn: (rows: TRow[]) => TRow[]): Promise<TRow[]> {
    return this.enqueue(() => {
      const current = this.snapshot<TRow>(table);
      const next = fn(current);
      this.tables.set(table, next);
      return next;
    });
  }

  private snapshot<TRow>(table: TableName): TRow[] {
    return [...((this.tables.get(table) as TRow[] | undefined) ?? [])];
  }

  private enqueue<T>(task: () => Promise<T> | T): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
