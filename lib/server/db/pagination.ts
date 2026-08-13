import 'server-only';

import { InvalidCursorError } from './errors';

/** `api-contract.md` §1 "Pagination": every collection response shape. */
export interface Page<TItem> {
  items: TItem[];
  nextCursor: string | null;
}

interface CursorPayload {
  /** The sort-key value of the last row on the previous page, stringified. */
  k: string;
  /** The `id` of the last row on the previous page — the tiebreaker when sort keys collide. */
  id: string;
}

/** Opaque to the client (api-contract.md §1: "Cursors are opaque and must not be constructed by
 * the client") — base64url of the sort key + id, exactly as data-model.md's task description
 * specifies ("Cursor pagination is implemented once, opaquely (base64 of the sort key + id)"). */
function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): CursorPayload {
  let json: string;
  try {
    json = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new InvalidCursorError(cursor);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidCursorError(cursor);
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Partial<CursorPayload>).k !== 'string' ||
    typeof (parsed as Partial<CursorPayload>).id !== 'string'
  ) {
    throw new InvalidCursorError(cursor);
  }

  return parsed as CursorPayload;
}

export interface PaginateOptions<TRow> {
  /** Pre-filtered rows (already scoped to `userId` and any other query filters). Not required to
   * be pre-sorted — `paginate` sorts. */
  rows: TRow[];
  /** Extracts the sort-key value. Must be a string that sorts correctly with `<`/`>` (ISO-8601
   * timestamps satisfy this). */
  sortKey: (row: TRow) => string;
  /** Extracts the row's id — the stable tiebreaker when two rows share a sort key. */
  id: (row: TRow) => string;
  direction: 'asc' | 'desc';
  cursor?: string;
  limit: number;
}

/**
 * The one cursor-pagination implementation every repository's `list()` calls. Ordering is
 * `(sortKey, id)` — `id` ascending as the tiebreaker regardless of `direction`, so the order is
 * total (data-model.md doesn't require this, but a total order is what makes "across a page
 * boundary" well-defined when two rows share a millisecond-precision timestamp).
 *
 * A cursor whose row has since been deleted is handled by position, not by presence: the page
 * resumes at the first row that would have sorted after the cursor's `(k, id)` pair, whether or
 * not that exact row still exists. Only a structurally unparseable cursor throws — see
 * {@link InvalidCursorError}.
 */
export function paginate<TRow>(options: PaginateOptions<TRow>): Page<TRow> {
  const { rows, sortKey, id, direction, cursor, limit } = options;

  const sorted = [...rows].sort((a, b) => {
    const ak = sortKey(a);
    const bk = sortKey(b);
    if (ak !== bk) {
      const cmp = ak < bk ? -1 : 1;
      return direction === 'desc' ? -cmp : cmp;
    }
    const aid = id(a);
    const bid = id(b);
    return aid < bid ? -1 : aid > bid ? 1 : 0;
  });

  let startIndex = 0;
  if (cursor !== undefined) {
    const payload = decodeCursor(cursor);
    const isAfter = (row: TRow): boolean => {
      const rk = sortKey(row);
      if (rk !== payload.k) {
        const cmp = rk < payload.k ? -1 : 1;
        return direction === 'desc' ? cmp < 0 : cmp > 0;
      }
      return id(row) > payload.id;
    };
    const foundIndex = sorted.findIndex(isAfter);
    startIndex = foundIndex === -1 ? sorted.length : foundIndex;
  }

  const items = sorted.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < sorted.length;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ k: sortKey(last), id: id(last) }) : null;

  return { items, nextCursor };
}
