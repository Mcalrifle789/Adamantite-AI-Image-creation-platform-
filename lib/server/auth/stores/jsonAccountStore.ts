import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  AccountNotFoundError,
  EmailTakenError,
  type AccountRow,
  type AccountStore,
  type CreateAccountInput,
  type UpdateAccountPatch,
} from '../types';

/**
 * File-backed accounts for local development. Deliberately *not* built on `JsonStore` from
 * `lib/server/db`: that module reads `lib/server/env.ts`, whose schema throws at import time if
 * any required var is missing, and the whole point of the auth env split is that signing in
 * never depends on unrelated config.
 *
 * This store is not viable in production. Vercel's filesystem is read-only apart from `/tmp`,
 * and `/tmp` is per-invocation — an account written by one request is gone by the next.
 * `getAccountStore()` says so out loud when it falls back to this on a production deploy.
 *
 * Writes go through a single promise chain and land via write-temp-then-rename, matching the
 * atomicity guarantee `JsonStore` documents (data-model.md §1).
 */
export const DEFAULT_ACCOUNT_DATA_DIR = 'E:\\Adamantite\\Database';
const FILE_NAME = 'accounts.json';

export function createJsonAccountStore(dataDir?: string): AccountStore {
  // `turbopackIgnore`: the argument is dynamic, so the bundler cannot statically scope this
  // path and would otherwise pull the whole project tree into the serverless bundle. This store
  // is the local-development path only — in production `DATABASE_URL` is set and Postgres is
  // used instead — so there is nothing for the bundler to trace here.
  const directory = path.resolve(
    /* turbopackIgnore: true */ dataDir ?? process.env.ADAMANTITE_DATA_DIR ?? DEFAULT_ACCOUNT_DATA_DIR,
  );
  const filePath = path.join(directory, FILE_NAME);
  let queue: Promise<unknown> = Promise.resolve();

  async function readAll(): Promise<AccountRow[]> {
    try {
      const text = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(text) as unknown;
      return Array.isArray(parsed) ? (parsed as AccountRow[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async function writeAll(rows: AccountRow[]): Promise<void> {
    await fs.mkdir(directory, { recursive: true });
    const tempPath = `${filePath}.${process.pid}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(rows, null, 2), 'utf8');
    await fs.rename(tempPath, filePath);
  }

  /** Serialises every mutation so a concurrent register/register cannot lose a row. */
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.catch(() => undefined);
    return result;
  }

  return {
    kind: 'json',

    async init() {
      await fs.mkdir(directory, { recursive: true });
    },

    async findById(id) {
      const rows = await readAll();
      return rows.find((row) => row.id === id) ?? null;
    },

    async findByEmail(email) {
      const rows = await readAll();
      const needle = email.toLowerCase();
      return rows.find((row) => row.email.toLowerCase() === needle) ?? null;
    },

    async list() {
      return readAll();
    },

    create(input: CreateAccountInput) {
      return enqueue(async () => {
        const rows = await readAll();
        const needle = input.email.toLowerCase();
        if (rows.some((row) => row.email.toLowerCase() === needle)) throw new EmailTakenError();

        const row: AccountRow = {
          id: input.id,
          display_name: input.displayName,
          email: input.email,
          password_hash: input.passwordHash,
          plan_id: input.planId,
          role: input.role ?? 'user',
          token_version: 1,
          created_at: input.createdAt,
          updated_at: input.createdAt,
          last_login_at: null,
        };
        await writeAll([...rows, row]);
        return row;
      });
    },

    update(id: string, patch: UpdateAccountPatch) {
      return enqueue(async () => {
        const rows = await readAll();
        const index = rows.findIndex((row) => row.id === id);
        if (index === -1) throw new AccountNotFoundError(id);

        if (patch.email !== undefined) {
          const needle = patch.email.toLowerCase();
          if (rows.some((row) => row.id !== id && row.email.toLowerCase() === needle)) {
            throw new EmailTakenError();
          }
        }

        const updated: AccountRow = {
          ...rows[index]!,
          ...patch,
          updated_at: new Date().toISOString(),
        };
        const next = [...rows];
        next[index] = updated;
        await writeAll(next);
        return updated;
      });
    },
  };
}
