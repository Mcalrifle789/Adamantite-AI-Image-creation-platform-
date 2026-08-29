import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { env } from '../env';
import type { TableName } from './schema';
import { TABLE_FILE_NAMES, type Store, type TableFile } from './store';

/**
 * data-model.md §1: default data directory, override with `ADAMANTITE_DATA_DIR` (read once
 * through `lib/server/env.ts` — never `process.env` directly, architecture.md §9).
 */
export const DEFAULT_DATA_DIR = 'E:\\Adamantite\\Database';

/** The exact resolution `JsonStore`'s constructor applies, exported so callers that need to
 * act on the data directory directly (e.g. `seed.ts --reset` wiping it) resolve the identical
 * path rather than re-deriving the same three-way fallback and risking drift. */
export function resolveDataDir(explicit?: string): string {
  return path.resolve(explicit ?? env.ADAMANTITE_DATA_DIR ?? DEFAULT_DATA_DIR);
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

/**
 * Every `JsonStore` instance keeps a read-through cache of table rows, keyed by table name.
 * data-model.md §1: "Reads go through a module-level cache invalidated on write, pinned to
 * `globalThis` so it survives Next.js hot reload." Next.js dev mode re-evaluates modules on
 * every edit, which would otherwise reset a plain module-level `Map` to empty on every save;
 * `globalThis` is the one object hot reload does not touch. Caches are keyed by resolved data
 * directory so two stores pointed at different directories (e.g. two tests running in the same
 * process) never share state.
 */
type CacheRegistry = Map<string, Map<TableName, unknown[]>>;

const globalForJsonStore = globalThis as unknown as {
  __adamantiteJsonStoreCaches?: CacheRegistry;
};

function getCacheRegistry(): CacheRegistry {
  if (!globalForJsonStore.__adamantiteJsonStoreCaches) {
    globalForJsonStore.__adamantiteJsonStoreCaches = new Map();
  }
  return globalForJsonStore.__adamantiteJsonStoreCaches;
}

/**
 * Durable, atomic, serialized JSON-file table storage (ADR-01, data-model.md §1).
 *
 * **Atomicity.** Every write goes to `<file>.tmp`, is `fsync`'d, then `rename`'d over the real
 * file. `rename` on the same filesystem is atomic on both POSIX and NTFS, so a reader never
 * observes a partially-written file and a crash mid-write leaves the previous version intact.
 *
 * **Serialization.** Every `read`/`mutate` call on one `JsonStore` instance is queued through a
 * single in-process `Promise` chain (`this.queue`), so two calls issued concurrently (e.g. two
 * requests in the same Next.js dev server) execute strictly one after another — never
 * interleaved. This is what makes a read-check-write sequence (the credit gate, built in a later
 * task) safe without a database transaction.
 *
 * **Advisory lock, not enforcement.** `JsonStore` writes a `.lock` file into the data directory
 * on first use and leaves it there advisory-only: a second process (a second `next dev`, a
 * background worker, a real multi-instance deploy) is not blocked by it — it cannot be, without
 * a real distributed lock, which is exactly the complexity ADR-01 chose not to pay for. Its only
 * job is to make a lingering conflict *observable* (a log line), because **multi-process writing
 * to the same data directory is explicitly unsupported** and is, by design, the trigger for
 * migrating to SQLite/Postgres (ADR-01 "What would make us revisit this", trigger 1).
 */
export class JsonStore implements Store {
  private readonly dataDir: string;
  private readonly cache: Map<TableName, unknown[]>;
  private queue: Promise<unknown> = Promise.resolve();
  private lockAcquired = false;

  constructor(dataDir?: string) {
    this.dataDir = resolveDataDir(dataDir);

    const registry = getCacheRegistry();
    let cache = registry.get(this.dataDir);
    if (!cache) {
      cache = new Map();
      registry.set(this.dataDir, cache);
    }
    this.cache = cache;
  }

  async read<TRow>(table: TableName): Promise<TRow[]> {
    return this.enqueue(() => this.readThroughCache<TRow>(table));
  }

  async mutate<TRow>(table: TableName, fn: (rows: TRow[]) => TRow[]): Promise<TRow[]> {
    return this.enqueue(async () => {
      await this.ensureLock();
      const current = await this.readThroughCache<TRow>(table);
      const next = fn([...current]);
      await this.writeTable(table, next);
      return next;
    });
  }

  private async readThroughCache<TRow>(table: TableName): Promise<TRow[]> {
    const cached = this.cache.get(table);
    if (cached) return cached as TRow[];

    const rows = await this.readFromDisk<TRow>(table);
    this.cache.set(table, rows);
    return rows;
  }

  private filePath(table: TableName): string {
    return path.join(this.dataDir, TABLE_FILE_NAMES[table]);
  }

  private lockPath(): string {
    return path.join(this.dataDir, '.lock');
  }

  private async readFromDisk<TRow>(table: TableName): Promise<TRow[]> {
    const filePath = this.filePath(table);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (isErrnoException(error) && error.code === 'ENOENT') return [];
      throw error;
    }

    let parsed: TableFile<TRow>;
    try {
      parsed = JSON.parse(raw) as TableFile<TRow>;
    } catch {
      throw new Error(`Corrupt table file (invalid JSON): ${filePath}`);
    }

    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.rows)) {
      throw new Error(`Corrupt table file (unexpected shape): ${filePath}`);
    }

    return parsed.rows;
  }

  private async writeTable<TRow>(table: TableName, rows: TRow[]): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });

    const filePath = this.filePath(table);
    const tmpPath = `${filePath}.tmp`;
    const payload: TableFile<TRow> = { version: 1, rows };
    const json = JSON.stringify(payload, null, 2);

    const handle = await fs.open(tmpPath, 'w');
    try {
      await handle.writeFile(json, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }

    await fs.rename(tmpPath, filePath);
    this.cache.set(table, rows);
  }

  /** Writes the advisory `.lock` file at most once per store instance. Never throws on
   * contention — see the class doc comment on why this is advisory, not enforcement. */
  private async ensureLock(): Promise<void> {
    if (this.lockAcquired) return;

    await fs.mkdir(this.dataDir, { recursive: true });
    const lockPath = this.lockPath();
    const payload = JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() });

    try {
      // 'wx' = create, fail if it already exists. That failure is the observable signal, not a
      // guard we act on — see the class doc comment.
      await fs.writeFile(lockPath, payload, { flag: 'wx' });
    } catch (error) {
      if (isErrnoException(error) && error.code === 'EEXIST') {
        console.warn(
          `[JsonStore] advisory lock already present at ${lockPath}. Multi-process writes to ` +
            'the same data directory are unsupported (ADR-01) — if this is unexpected, another ' +
            'process (or an unclean previous exit) is writing here too.',
        );
      } else {
        throw error;
      }
    }

    this.lockAcquired = true;
  }

  private enqueue<T>(task: () => Promise<T> | T): Promise<T> {
    const run = this.queue.then(task, task);
    // The internal chain always resolves regardless of `run`'s outcome, so one failed operation
    // never wedges every operation queued after it. `run` itself still rejects for its caller.
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
