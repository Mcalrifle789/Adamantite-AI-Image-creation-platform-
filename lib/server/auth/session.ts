import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

import { isProduction, requireAuthSecret } from './authEnv';

/**
 * The `ada_session` cookie — the mechanism `.env.example` already reserved `AUTH_SECRET` for:
 * "Signs and verifies the `ada_session` cookie (HMAC)".
 *
 * Format: `<base64url(payload JSON)>.<base64url(HMAC-SHA256)>`. This is a *stateless* session —
 * there is no server-side session table to look up, which is what lets it work unchanged on
 * Vercel's per-invocation Lambdas. The trade-off is that a stolen cookie stays valid until it
 * expires; `tokenVersion` is the revocation lever (bump the user's row and every issued cookie
 * for that account stops verifying), used by the change-password flow.
 */
export const SESSION_COOKIE = 'ada_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  /** User id. */
  uid: string;
  /** Issued-at, epoch seconds. */
  iat: number;
  /** Expiry, epoch seconds. */
  exp: number;
  /** Matches `users.token_version`; a mismatch invalidates the cookie. */
  ver: number;
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadSegment: string): string {
  return createHmac('sha256', requireAuthSecret()).update(payloadSegment).digest('base64url');
}

export function createSessionToken(userId: string, tokenVersion: number, nowMs = Date.now()): string {
  const issuedAt = Math.floor(nowMs / 1000);
  const payload: SessionPayload = {
    uid: userId,
    iat: issuedAt,
    exp: issuedAt + SESSION_MAX_AGE_SECONDS,
    ver: tokenVersion,
  };
  const segment = base64UrlEncode(JSON.stringify(payload));
  return `${segment}.${sign(segment)}`;
}

/**
 * Verifies signature *and* expiry. Returns `null` for anything that does not check out — a
 * tampered payload, an unknown format, a stale cookie — so callers only ever branch on
 * "session or no session", never on a failure reason they might accidentally leak.
 */
export function verifySessionToken(token: string | undefined, nowMs = Date.now()): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;

  const segment = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let expectedSignature: string;
  try {
    expectedSignature = sign(segment);
  } catch {
    // AUTH_SECRET missing — treat as "not signed in" rather than crashing every page render.
    return null;
  }

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload?.uid !== 'string' || !payload.uid) return null;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;
  if (typeof payload.ver !== 'number') return null;

  return payload;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
} as const;

/** Writes the signed cookie. `secure` is on everywhere except local HTTP dev, where it would
 * make the cookie silently undeliverable. */
export async function setSessionCookie(userId: string, tokenVersion: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userId, tokenVersion), {
    ...COOKIE_OPTIONS,
    secure: isProduction(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, '', {
    ...COOKIE_OPTIONS,
    secure: isProduction(),
    maxAge: 0,
  });
}

export async function readSessionPayload(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}
