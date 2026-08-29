import 'server-only';

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * Password hashing with `scrypt` from `node:crypto` — no native dependency, which matters
 * because Vercel's build would otherwise have to compile bcrypt/argon2 bindings for the Lambda
 * runtime. scrypt is memory-hard and is the algorithm Node itself recommends for this job.
 *
 * Stored format: `scrypt$<N>$<r>$<p>$<saltHex>$<keyHex>`. The parameters are written into the
 * string rather than assumed, so raising the cost later leaves every existing hash verifiable —
 * {@link needsRehash} tells the login route when to transparently upgrade one.
 */
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** N=2^15 — ~50ms on a Vercel Lambda; the practical ceiling before serverless cold starts hurt. */
const COST = 32_768;
const BLOCK_SIZE = 8;
const PARALLELISATION = 1;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(normalise(password), salt, KEY_LENGTH);
  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELISATION,
    salt.toString('hex'),
    key.toString('hex'),
  ].join('$');
}

/**
 * Constant-time verification. Returns `false` for every malformed/unknown hash rather than
 * throwing, so a corrupted row reads as "wrong password" instead of a 500 that tells an attacker
 * the account exists.
 */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, costText, , , saltHex, keyHex] = parts;
  const cost = Number(costText);
  if (!Number.isInteger(cost) || cost <= 0) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex!, 'hex');
    expected = Buffer.from(keyHex!, 'hex');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scrypt(normalise(password), salt, expected.length);
  } catch {
    return false;
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** True when `stored` was produced with weaker parameters than the current constants. */
export function needsRehash(stored: string | null): boolean {
  if (!stored) return true;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  return Number(parts[1]) < COST;
}

/**
 * NFKC so a password typed with a composed accent on one keyboard and a decomposed one on
 * another still matches, and so the byte length checked below is stable.
 */
function normalise(password: string): string {
  return password.normalize('NFKC');
}
