import { describe, expect, it } from 'vitest';

import { InvalidCursorError } from '../../../lib/server/db/errors';
import { paginate } from '../../../lib/server/db/pagination';

interface Row {
  id: string;
  updatedAt: string;
}

function row(id: string, updatedAt: string): Row {
  return { id, updatedAt };
}

describe('paginate', () => {
  const rows: Row[] = [
    row('a', '2026-01-01T00:00:00.000Z'),
    row('b', '2026-01-02T00:00:00.000Z'),
    row('c', '2026-01-03T00:00:00.000Z'),
    row('d', '2026-01-04T00:00:00.000Z'),
    row('e', '2026-01-05T00:00:00.000Z'),
  ];

  it('returns the first page, newest-first, with a non-null cursor when more remain', () => {
    const page = paginate({
      rows,
      sortKey: (r) => r.updatedAt,
      id: (r) => r.id,
      direction: 'desc',
      limit: 2,
    });

    expect(page.items.map((r) => r.id)).toEqual(['e', 'd']);
    expect(page.nextCursor).not.toBeNull();
  });

  it('walks every page to the end and returns null on the last page — across a page boundary', () => {
    const seen: string[] = [];
    let cursor: string | undefined;

    for (let guard = 0; guard < 10; guard += 1) {
      const page = paginate({
        rows,
        sortKey: (r) => r.updatedAt,
        id: (r) => r.id,
        direction: 'desc',
        limit: 2,
        cursor,
      });
      seen.push(...page.items.map((r) => r.id));
      if (page.nextCursor === null) break;
      cursor = page.nextCursor;
    }

    expect(seen).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('supports ascending order (e.g. chat messages, chronological)', () => {
    const page = paginate({
      rows,
      sortKey: (r) => r.updatedAt,
      id: (r) => r.id,
      direction: 'asc',
      limit: 3,
    });
    expect(page.items.map((r) => r.id)).toEqual(['a', 'b', 'c']);

    const next = paginate({
      rows,
      sortKey: (r) => r.updatedAt,
      id: (r) => r.id,
      direction: 'asc',
      limit: 3,
      cursor: page.nextCursor ?? undefined,
    });
    expect(next.items.map((r) => r.id)).toEqual(['d', 'e']);
    expect(next.nextCursor).toBeNull();
  });

  it('resumes correctly even if the cursor row was deleted since the cursor was issued', () => {
    const firstPage = paginate({
      rows,
      sortKey: (r) => r.updatedAt,
      id: (r) => r.id,
      direction: 'desc',
      limit: 3,
    });
    expect(firstPage.items.map((r) => r.id)).toEqual(['e', 'd', 'c']);

    // "c" (the cursor's row) is gone by the time page 2 is requested.
    const withoutC = rows.filter((r) => r.id !== 'c');
    const secondPage = paginate({
      rows: withoutC,
      sortKey: (r) => r.updatedAt,
      id: (r) => r.id,
      direction: 'desc',
      limit: 3,
      cursor: firstPage.nextCursor ?? undefined,
    });
    expect(secondPage.items.map((r) => r.id)).toEqual(['b', 'a']);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('throws a typed InvalidCursorError, coded VALIDATION_ERROR, on an unparseable cursor', () => {
    expect(() =>
      paginate({
        rows,
        sortKey: (r) => r.updatedAt,
        id: (r) => r.id,
        direction: 'desc',
        limit: 2,
        cursor: 'not-valid-base64url-json!!',
      }),
    ).toThrow(InvalidCursorError);

    try {
      paginate({
        rows,
        sortKey: (r) => r.updatedAt,
        id: (r) => r.id,
        direction: 'desc',
        limit: 2,
        cursor: 'also not valid',
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidCursorError);
      expect((error as InvalidCursorError).code).toBe('VALIDATION_ERROR');
    }
  });

  it('treats a well-formed but nonsensical cursor payload as unparseable, not a silent reset', () => {
    const bogusCursor = Buffer.from(JSON.stringify({ notK: 1 }), 'utf8').toString('base64url');
    expect(() =>
      paginate({
        rows,
        sortKey: (r) => r.updatedAt,
        id: (r) => r.id,
        direction: 'desc',
        limit: 2,
        cursor: bogusCursor,
      }),
    ).toThrow(InvalidCursorError);
  });
});
