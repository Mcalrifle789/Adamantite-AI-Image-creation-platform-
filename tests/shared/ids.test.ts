import { describe, expect, it } from 'vitest';

import { ID_PREFIXES, newId, parsePrefixedId } from '../../lib/shared/ids';

describe('newId', () => {
  it('produces <prefix>_<21-char nanoid> for every declared prefix', () => {
    for (const prefix of ID_PREFIXES) {
      const id = newId(prefix);
      expect(id).toMatch(new RegExp(`^${prefix}_[A-Za-z0-9_-]{21}$`));
    }
  });

  it('produces unique ids across calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId('prj')));
    expect(ids.size).toBe(200);
  });
});

describe('parsePrefixedId', () => {
  it('round-trips a well-formed id', () => {
    const id = newId('gen');
    const parsed = parsePrefixedId(id);
    expect(parsed).not.toBeNull();
    expect(parsed?.prefix).toBe('gen');
    expect(`${parsed?.prefix}_${parsed?.randomPart}`).toBe(id);
  });

  it('rejects an unknown prefix', () => {
    expect(parsePrefixedId(`xyz_${'a'.repeat(21)}`)).toBeNull();
  });

  it('rejects a malformed random part', () => {
    expect(parsePrefixedId('prj_tooshort')).toBeNull();
  });

  it('rejects input with no separator', () => {
    expect(parsePrefixedId('notanid')).toBeNull();
  });

  it('rejects an empty string', () => {
    expect(parsePrefixedId('')).toBeNull();
  });
});
