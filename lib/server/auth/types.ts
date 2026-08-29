import 'server-only';

import type { PlanId } from '../../shared/api-types';

/**
 * The account record, as the auth layer sees it. A superset of `UserRow` in
 * `lib/server/db/schema.ts` — that row was written for the M1 demo user, which had no
 * credentials at all. The four extra columns are exactly what accounts require:
 * `password_hash`, `token_version` (session revocation), `plan_id` (what the profile panel
 * shows), and `last_login_at`.
 */
export interface AccountRow {
  id: string;
  display_name: string;
  email: string;
  password_hash: string;
  plan_id: PlanId;
  token_version: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface CreateAccountInput {
  id: string;
  displayName: string;
  /** Already normalised to lower-case by the caller. */
  email: string;
  passwordHash: string;
  planId: PlanId;
  createdAt: string;
}

export interface UpdateAccountPatch {
  display_name?: string;
  email?: string;
  password_hash?: string;
  plan_id?: PlanId;
  token_version?: number;
  last_login_at?: string;
}

/**
 * The seam that keeps "where accounts live" out of every route handler. Two implementations
 * ship: Postgres (the only one that persists on Vercel) and a JSON file (local dev).
 */
export interface AccountStore {
  /** Idempotent schema setup. Called once per process, before the first read/write. */
  init(): Promise<void>;
  findById(id: string): Promise<AccountRow | null>;
  findByEmail(email: string): Promise<AccountRow | null>;
  create(input: CreateAccountInput): Promise<AccountRow>;
  update(id: string, patch: UpdateAccountPatch): Promise<AccountRow>;
  /** Identifies the backing store in diagnostics and in the dev-only persistence warning. */
  readonly kind: 'postgres' | 'json';
}

/** Thrown when a registration collides with an existing account. */
export class EmailTakenError extends Error {
  constructor() {
    super('An account with that email already exists.');
    this.name = 'EmailTakenError';
  }
}

export class AccountNotFoundError extends Error {
  constructor(id: string) {
    super(`No account with id ${id}.`);
    this.name = 'AccountNotFoundError';
  }
}
