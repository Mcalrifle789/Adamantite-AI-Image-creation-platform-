import { describe, expect, it } from 'vitest';

import { hashPassword, needsRehash, verifyPassword } from '@/lib/server/auth/password';

describe('password hashing', () => {
  it('produces a self-describing hash that never contains the plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash.split('$')).toHaveLength(6);
    expect(hash).not.toContain('correct horse');
  });

  it('salts, so the same password hashes differently every time', async () => {
    const [first, second] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);

    expect(first).not.toEqual(second);
    await expect(verifyPassword('same-password', first)).resolves.toBe(true);
    await expect(verifyPassword('same-password', second)).resolves.toBe(true);
  });

  it('accepts the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('s3cret-passphrase');

    await expect(verifyPassword('s3cret-passphrase', hash)).resolves.toBe(true);
    await expect(verifyPassword('s3cret-passphras', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('normalises unicode so a composed and decomposed password match', async () => {
    // The same string to a human, different bytes: U+00E9 vs "e" + U+0301. Typing one on a Mac
    // and the other on Windows must not lock someone out of their own account.
    const composed = 'mot-de-passe-café';
    const decomposed = 'mot-de-passe-café';
    expect(composed).not.toEqual(decomposed);

    const hash = await hashPassword(composed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });

  // A corrupted or legacy row must read as "wrong password", never as a crash — a 500 here
  // would tell an attacker the account exists.
  it.each([
    ['null', null],
    ['empty', ''],
    ['unknown algorithm', 'bcrypt$10$abc$def$ghi$jkl'],
    ['too few segments', 'scrypt$32768$8$1$abcd'],
    ['non-numeric cost', 'scrypt$notanumber$8$1$ab$cd'],
    ['empty salt and key', 'scrypt$32768$8$1$$'],
  ])('returns false for a malformed hash (%s) instead of throwing', async (_label, stored) => {
    await expect(verifyPassword('anything', stored)).resolves.toBe(false);
  });

  it('flags only weaker-than-current hashes for rehash', async () => {
    const current = await hashPassword('whatever');

    expect(needsRehash(current)).toBe(false);
    expect(needsRehash('scrypt$16384$8$1$ab$cd')).toBe(true);
    expect(needsRehash(null)).toBe(true);
    expect(needsRehash('garbage')).toBe(true);
  });
});
