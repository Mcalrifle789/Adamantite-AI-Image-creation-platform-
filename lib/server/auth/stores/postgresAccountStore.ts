import 'server-only';

import { Pool } from 'pg';

import { loadAuthEnv } from '../authEnv';
import {
  AccountNotFoundError,
  EmailTakenError,
  type AccountRow,
  type AccountStore,
} from '../types';

/**
 * Postgres-backed accounts — the production path. Works against Neon, Vercel Postgres,
 * Supabase, Railway, or a local server; nothing here is provider-specific beyond the
 * `sslmode` handling below.
 *
 * The pool is pinned to `globalThis` for the same reason `JsonStore`'s cache is
 * (`lib/server/db/index.ts`): Next.js re-evaluates modules on hot reload, and a warm Lambda
 * re-uses its module scope across invocations. Without the pin, every reload/invocation would
 * open a fresh pool and exhaust the connection limit that serverless Postgres plans are strict
 * about. `max: 3` for the same reason — many short-lived Lambdas, few connections each.
 */
const globalForPool = globalThis as unknown as { __adamantitePgPool?: Pool };

function getPool(connectionString: string): Pool {
  if (!globalForPool.__adamantitePgPool) {
    const { DATABASE_SSL_NO_VERIFY } = loadAuthEnv();
    globalForPool.__adamantitePgPool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      // Hosted Postgres is TLS-only; several providers present certs that Node's default CA
      // bundle rejects. Opt into relaxed verification explicitly rather than silently.
      ssl:
        DATABASE_SSL_NO_VERIFY === '1' || /sslmode=require/.test(connectionString)
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return globalForPool.__adamantitePgPool;
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ada_accounts (
    id             TEXT PRIMARY KEY,
    display_name   TEXT        NOT NULL,
    email          TEXT        NOT NULL,
    password_hash  TEXT        NOT NULL,
    plan_id        TEXT        NOT NULL DEFAULT 'port',
    token_version  INTEGER     NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at  TIMESTAMPTZ
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ada_accounts_email_key ON ada_accounts (lower(email));
`;

/** Postgres reports a unique-index collision as SQLSTATE 23505. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

interface RawRow {
  id: string;
  display_name: string;
  email: string;
  password_hash: string;
  plan_id: string;
  token_version: number;
  created_at: Date | string;
  updated_at: Date | string;
  last_login_at: Date | string | null;
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: RawRow): AccountRow {
  return {
    id: row.id,
    display_name: row.display_name,
    email: row.email,
    password_hash: row.password_hash,
    plan_id: row.plan_id as AccountRow['plan_id'],
    token_version: Number(row.token_version),
    created_at: toIso(row.created_at)!,
    updated_at: toIso(row.updated_at)!,
    last_login_at: toIso(row.last_login_at),
  };
}

const COLUMNS =
  'id, display_name, email, password_hash, plan_id, token_version, created_at, updated_at, last_login_at';

export function createPostgresAccountStore(connectionString: string): AccountStore {
  const pool = getPool(connectionString);
  let initialised: Promise<void> | null = null;

  return {
    kind: 'postgres',

    // Memoised on the promise, not a boolean, so two concurrent first requests share one
    // CREATE TABLE round-trip instead of racing each other.
    init() {
      initialised ??= pool.query(CREATE_TABLE_SQL).then(() => undefined);
      return initialised;
    },

    async findById(id) {
      const result = await pool.query<RawRow>(
        `SELECT ${COLUMNS} FROM ada_accounts WHERE id = $1 LIMIT 1`,
        [id],
      );
      return result.rows[0] ? mapRow(result.rows[0]) : null;
    },

    async findByEmail(email) {
      const result = await pool.query<RawRow>(
        `SELECT ${COLUMNS} FROM ada_accounts WHERE lower(email) = lower($1) LIMIT 1`,
        [email],
      );
      return result.rows[0] ? mapRow(result.rows[0]) : null;
    },

    async create(input) {
      try {
        const result = await pool.query<RawRow>(
          `INSERT INTO ada_accounts (id, display_name, email, password_hash, plan_id, token_version, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 1, $6, $6)
           RETURNING ${COLUMNS}`,
          [input.id, input.displayName, input.email, input.passwordHash, input.planId, input.createdAt],
        );
        return mapRow(result.rows[0]!);
      } catch (error) {
        if (isUniqueViolation(error)) throw new EmailTakenError();
        throw error;
      }
    },

    async update(id, patch) {
      const assignments: string[] = [];
      const values: unknown[] = [];
      for (const [column, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        values.push(value);
        assignments.push(`${column} = $${values.length}`);
      }

      if (assignments.length === 0) {
        const existing = await pool.query<RawRow>(
          `SELECT ${COLUMNS} FROM ada_accounts WHERE id = $1 LIMIT 1`,
          [id],
        );
        if (!existing.rows[0]) throw new AccountNotFoundError(id);
        return mapRow(existing.rows[0]);
      }

      values.push(id);
      try {
        const result = await pool.query<RawRow>(
          `UPDATE ada_accounts SET ${assignments.join(', ')}, updated_at = now()
           WHERE id = $${values.length}
           RETURNING ${COLUMNS}`,
          values,
        );
        if (!result.rows[0]) throw new AccountNotFoundError(id);
        return mapRow(result.rows[0]);
      } catch (error) {
        if (isUniqueViolation(error)) throw new EmailTakenError();
        throw error;
      }
    },
  };
}
