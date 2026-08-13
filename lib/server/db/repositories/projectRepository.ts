import 'server-only';

import type { ProjectStatus } from '../../../shared/api-types';
import { CheckConstraintViolationError, RepositoryNotFoundError } from '../errors';
import { paginate, type Page } from '../pagination';
import type { ProjectRow } from '../schema';
import type { Store } from '../store';

/** data-model.md §3.3: `CHECK ((status='trashed') = (trashed_at IS NOT NULL))`. */
function assertCheckConstraint(row: ProjectRow): void {
  const consistent = (row.status === 'trashed') === (row.trashed_at !== null);
  if (!consistent) {
    throw new CheckConstraintViolationError(
      'projects',
      "(status='trashed') = (trashed_at IS NOT NULL)",
    );
  }
}

export interface ListProjectsQuery {
  status: ProjectStatus;
  cursor?: string;
  limit: number;
}

/** data-model.md §4. Every finder takes `userId` first — there is no method here capable of
 * returning, updating, or purging another user's project. */
export interface ProjectRepository {
  create(row: ProjectRow): Promise<ProjectRow>;
  findById(userId: string, id: string): Promise<ProjectRow | null>;
  /** Indexed query path `(user_id, status, updated_at DESC)` — data-model.md §3.3. */
  list(userId: string, query: ListProjectsQuery): Promise<Page<ProjectRow>>;
  update(userId: string, id: string, patch: Partial<ProjectRow>): Promise<ProjectRow>;
  purge(userId: string, id: string): Promise<void>;
  /**
   * Counts rows toward the 200-project cap (`PROJECT_LIMIT_REACHED`, data-model.md §3.3:
   * "200 active + trashed projects per user"). The name matches the interface data-model.md §4
   * specifies verbatim, but the count itself spans **both** `active` and `trashed` rows — a
   * purged project is the only kind that stops counting.
   */
  countActive(userId: string): Promise<number>;
}

export function createProjectRepository(store: Store): ProjectRepository {
  return {
    async create(row) {
      assertCheckConstraint(row);
      await store.mutate<ProjectRow>('projects', (rows) => [...rows, row]);
      return row;
    },

    async findById(userId, id) {
      const rows = await store.read<ProjectRow>('projects');
      return rows.find((row) => row.user_id === userId && row.id === id) ?? null;
    },

    async list(userId, query) {
      const rows = await store.read<ProjectRow>('projects');
      const scoped = rows.filter((row) => row.user_id === userId && row.status === query.status);
      return paginate({
        rows: scoped,
        sortKey: (row) => row.updated_at,
        id: (row) => row.id,
        direction: 'desc',
        cursor: query.cursor,
        limit: query.limit,
      });
    },

    async update(userId, id, patch) {
      let updated: ProjectRow | undefined;
      await store.mutate<ProjectRow>('projects', (rows) =>
        rows.map((row) => {
          if (row.user_id !== userId || row.id !== id) return row;
          const next: ProjectRow = { ...row, ...patch };
          assertCheckConstraint(next);
          updated = next;
          return next;
        }),
      );
      if (!updated) throw new RepositoryNotFoundError('projects', id);
      return updated;
    },

    async purge(userId, id) {
      await store.mutate<ProjectRow>('projects', (rows) =>
        rows.filter((row) => !(row.user_id === userId && row.id === id)),
      );
    },

    async countActive(userId) {
      const rows = await store.read<ProjectRow>('projects');
      return rows.filter((row) => row.user_id === userId).length;
    },
  };
}
