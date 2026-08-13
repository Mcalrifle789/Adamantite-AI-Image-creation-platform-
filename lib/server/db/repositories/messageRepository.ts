import 'server-only';

import { CheckConstraintViolationError, RepositoryNotFoundError } from '../errors';
import { paginate, type Page } from '../pagination';
import type { MessageRow } from '../schema';
import type { Store } from '../store';

/** data-model.md §3.6: `CHECK (role='assistant' OR status='complete')` — user messages are
 * never pending. */
function assertCheckConstraint(row: MessageRow): void {
  const consistent = row.role === 'assistant' || row.status === 'complete';
  if (!consistent) {
    throw new CheckConstraintViolationError('messages', "role='assistant' OR status='complete'");
  }
}

export interface ListMessagesQuery {
  cursor?: string;
  limit: number;
}

/** data-model.md §4 pattern. Every finder takes `userId` first. */
export interface MessageRepository {
  create(row: MessageRow): Promise<MessageRow>;
  findById(userId: string, id: string): Promise<MessageRow | null>;
  /** Indexed query path `(project_id, created_at ASC)` — chronological reading order,
   * data-model.md §3.6. */
  listByProject(userId: string, projectId: string, query: ListMessagesQuery): Promise<Page<MessageRow>>;
  update(userId: string, id: string, patch: Partial<MessageRow>): Promise<MessageRow>;
  purgeByProject(userId: string, projectId: string): Promise<void>;
}

export function createMessageRepository(store: Store): MessageRepository {
  return {
    async create(row) {
      assertCheckConstraint(row);
      await store.mutate<MessageRow>('messages', (rows) => [...rows, row]);
      return row;
    },

    async findById(userId, id) {
      const rows = await store.read<MessageRow>('messages');
      return rows.find((row) => row.user_id === userId && row.id === id) ?? null;
    },

    async listByProject(userId, projectId, query) {
      const rows = await store.read<MessageRow>('messages');
      const scoped = rows.filter((row) => row.user_id === userId && row.project_id === projectId);
      return paginate({
        rows: scoped,
        sortKey: (row) => row.created_at,
        id: (row) => row.id,
        direction: 'asc',
        cursor: query.cursor,
        limit: query.limit,
      });
    },

    async update(userId, id, patch) {
      let updated: MessageRow | undefined;
      await store.mutate<MessageRow>('messages', (rows) =>
        rows.map((row) => {
          if (row.user_id !== userId || row.id !== id) return row;
          const next: MessageRow = { ...row, ...patch };
          assertCheckConstraint(next);
          updated = next;
          return next;
        }),
      );
      if (!updated) throw new RepositoryNotFoundError('messages', id);
      return updated;
    },

    async purgeByProject(userId, projectId) {
      await store.mutate<MessageRow>('messages', (rows) =>
        rows.filter((row) => !(row.user_id === userId && row.project_id === projectId)),
      );
    },
  };
}
