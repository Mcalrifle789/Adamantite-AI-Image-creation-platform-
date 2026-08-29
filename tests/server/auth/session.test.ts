import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from '@/lib/server/auth/session';

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-0123456789abcdef0123456789abcdef';
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = ORIGINAL_SECRET;
});

const NOW = Date.UTC(2026, 7, 29, 12, 0, 0);

describe('ada_session token', () => {
  it('round-trips the user id and token version', () => {
    const token = createSessionToken('usr_abc', 3, NOW);
    const payload = verifySessionToken(token, NOW);

    expect(payload).not.toBeNull();
    expect(payload!.uid).toBe('usr_abc');
    expect(payload!.ver).toBe(3);
    expect(payload!.exp - payload!.iat).toBe(SESSION_MAX_AGE_SECONDS);
  });

  it('rejects a tampered payload — the whole point of signing it', () => {
    const token = createSessionToken('usr_victim', 1, NOW);
    const [, signature] = token.split('.');

    const forgedPayload = Buffer.from(
      JSON.stringify({
        uid: 'usr_attacker',
        iat: Math.floor(NOW / 1000),
        exp: Math.floor(NOW / 1000) + 3600,
        ver: 1,
      }),
    ).toString('base64url');

    expect(verifySessionToken(`${forgedPayload}.${signature}`, NOW)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSessionToken('usr_abc', 1, NOW);

    process.env.AUTH_SECRET = 'a-completely-different-secret-value-here';
    try {
      expect(verifySessionToken(token, NOW)).toBeNull();
    } finally {
      process.env.AUTH_SECRET = 'test-secret-0123456789abcdef0123456789abcdef';
    }
  });

  it('rejects an expired token', () => {
    const token = createSessionToken('usr_abc', 1, NOW);
    const afterExpiry = NOW + (SESSION_MAX_AGE_SECONDS + 1) * 1000;

    expect(verifySessionToken(token, afterExpiry)).toBeNull();
    expect(verifySessionToken(token, NOW + 1000)).not.toBeNull();
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['no separator', 'notatoken'],
    ['empty payload segment', '.signature'],
    ['empty signature segment', 'payload.'],
    ['non-base64 payload', '!!!.!!!'],
  ])('rejects malformed input (%s)', (_label, token) => {
    expect(verifySessionToken(token as string | undefined, NOW)).toBeNull();
  });
});
