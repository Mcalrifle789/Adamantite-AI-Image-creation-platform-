import 'server-only';

/**
 * Typed errors thrown by the persistence layer. Route handlers (built in a later task) catch
 * these by `instanceof` and render the frozen error envelope (`api-contract.md` §1) — the
 * `code` on each error is chosen to match a contract error code 1:1 so that translation is a
 * mechanical `instanceof` → `fail(error.code, error.message)`, never a guess.
 */

/** Base class for every typed persistence error, so callers can catch broadly with
 * `error instanceof RepositoryError` when they only care "was this a store-layer error". */
export abstract class RepositoryError extends Error {
  abstract readonly code: string;
}

/**
 * `findById`/`update`/`purge` target a row that does not exist for the given `userId`. Note
 * this is deliberately indistinguishable from "exists but belongs to another user" — both cases
 * collapse to `NOT_FOUND` at the route layer (api-contract.md §1: "never 403 — ids must not be
 * enumerable").
 */
export class RepositoryNotFoundError extends RepositoryError {
  readonly code = 'NOT_FOUND' as const;

  constructor(
    public readonly table: string,
    public readonly id: string,
  ) {
    super(`${table} row not found: ${id}`);
    this.name = 'RepositoryNotFoundError';
  }
}

/** A UNIQUE constraint from data-model.md §3 was violated (`users.email`, `subscriptions.user_id`,
 * `idempotency (user_id, key)`). */
export class UniqueConstraintViolationError extends RepositoryError {
  readonly code = 'UNIQUE_CONSTRAINT_VIOLATION' as const;

  constructor(
    public readonly table: string,
    public readonly constraint: string,
  ) {
    super(`${table} violates unique constraint: ${constraint}`);
    this.name = 'UniqueConstraintViolationError';
  }
}

/**
 * `credit_ledger`'s `UNIQUE(user_id, generation_id, kind)` — the double-charge guard (ADR-04).
 * Kept as its own class (rather than reusing {@link UniqueConstraintViolationError}) because it
 * is the one constraint violation with its own documented business meaning: a generation already
 * has a ledger entry of this kind.
 */
export class LedgerConflictError extends RepositoryError {
  readonly code = 'LEDGER_ENTRY_CONFLICT' as const;

  constructor(
    public readonly userId: string,
    public readonly generationId: string,
    public readonly kind: string,
  ) {
    super(
      `Ledger entry already exists for user ${userId}, generation ${generationId}, kind "${kind}"`,
    );
    this.name = 'LedgerConflictError';
  }
}

/** A CHECK constraint from data-model.md §3 was violated on write. */
export class CheckConstraintViolationError extends RepositoryError {
  readonly code = 'CHECK_CONSTRAINT_VIOLATION' as const;

  constructor(
    public readonly table: string,
    public readonly constraint: string,
  ) {
    super(`${table} violates check constraint: ${constraint}`);
    this.name = 'CheckConstraintViolationError';
  }
}

/**
 * A pagination `cursor` was structurally unparseable. The route layer renders this as
 * `400 VALIDATION_ERROR` — never a silent reset to page one (data-model.md §6, api-contract.md
 * §1 "Pagination").
 */
export class InvalidCursorError extends RepositoryError {
  readonly code = 'VALIDATION_ERROR' as const;

  constructor(public readonly cursor: string) {
    super(`Unparseable pagination cursor: ${JSON.stringify(cursor)}`);
    this.name = 'InvalidCursorError';
  }
}
