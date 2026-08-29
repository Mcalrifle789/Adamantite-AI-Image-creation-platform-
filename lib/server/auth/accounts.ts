import 'server-only';

import { PLANS } from '../../../config/plans';
import type { AccountProfile, AccountSession } from '../../shared/api-types';
import { newId } from '../../shared/ids';
import { getReadyAccountStore } from './accountStore';
import { hashPassword, needsRehash, verifyPassword } from './password';
import { readSessionPayload } from './session';
import { EmailTakenError, type AccountRow } from './types';

/**
 * The account service — the only module route handlers talk to. Everything below deals in
 * `AccountRow`s and returns wire DTOs; no handler ever touches a password hash or a store.
 */

/** Every new account starts on the entry plan; upgrading is Stripe's job (`/pricing`). */
const DEFAULT_PLAN_ID = 'port' as const;

/** "Ada Lovelace" -> "AL"; "mike" -> "MI". Always two characters, always upper-case. */
export function deriveInitials(displayName: string, email: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
  }
  const source = words[0] ?? email;
  return source.slice(0, 2).toUpperCase().padEnd(2, source.slice(0, 1).toUpperCase() || 'A');
}

export function toAccountProfile(row: AccountRow): AccountProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    planId: row.plan_id,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    initials: deriveInitials(row.display_name, row.email),
  };
}

export function toAccountSession(row: AccountRow): AccountSession {
  const plan = PLANS[row.plan_id] ?? PLANS[DEFAULT_PLAN_ID];
  return {
    account: toAccountProfile(row),
    plan: {
      id: plan.id,
      name: plan.name,
      priceCents: plan.priceCents,
      monthlyCredits: plan.monthlyCredits,
      accent: plan.accent,
    },
  };
}

export async function registerAccount(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<AccountRow> {
  const store = await getReadyAccountStore();

  // Cheap pre-check for the common case; the store's unique index is still the authority, so a
  // race between two simultaneous sign-ups is caught there and surfaces as the same error.
  if (await store.findByEmail(input.email)) throw new EmailTakenError();

  return store.create({
    id: newId('usr'),
    displayName: input.displayName,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    planId: DEFAULT_PLAN_ID,
    createdAt: new Date().toISOString(),
  });
}

/**
 * A well-formed hash of a value nobody can supply. `verifyPassword` runs a full scrypt round
 * against it, which is the point: it makes the unknown-email path cost the same as the
 * wrong-password path. A literal (rather than a computed hash) keeps module load free of work.
 */
const DUMMY_HASH =
  'scrypt$32768$8$1$9f1c0a3b5d7e2f4a6b8c0d1e2f3a4b5c$' +
  '0a1b2c3d4e5f60718293a4b5c6d7e8f900112233445566778899aabbccddeeff';

/**
 * Returns the account on success, `null` on *any* failure — unknown email and wrong password
 * are deliberately indistinguishable to the caller, so the response cannot be used to enumerate
 * which addresses have accounts.
 *
 * A dummy verify runs on the unknown-email path so the two branches take comparable time; the
 * timing difference between "no scrypt at all" and "one scrypt" is otherwise large enough to
 * measure over the network.
 */
export async function authenticate(email: string, password: string): Promise<AccountRow | null> {
  const store = await getReadyAccountStore();
  const row = await store.findByEmail(email);

  if (!row) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  if (!(await verifyPassword(password, row.password_hash))) return null;

  const patch: Parameters<typeof store.update>[1] = { last_login_at: new Date().toISOString() };
  // Transparently upgrade hashes written under weaker parameters, now that we hold the plaintext.
  if (needsRehash(row.password_hash)) patch.password_hash = await hashPassword(password);

  return store.update(row.id, patch);
}

/** Resolves the signed-in account from the request's cookie, or `null`. */
export async function getCurrentAccount(): Promise<AccountRow | null> {
  const payload = await readSessionPayload();
  if (!payload) return null;

  const store = await getReadyAccountStore();
  const row = await store.findById(payload.uid);
  if (!row) return null;

  // A cookie issued before the last password change carries a stale version and is refused.
  if (row.token_version !== payload.ver) return null;

  return row;
}
