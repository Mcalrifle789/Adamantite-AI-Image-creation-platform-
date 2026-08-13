import 'server-only';

import type { GenerationStatus, MediaKind } from '../../../shared/api-types';
import { CheckConstraintViolationError, RepositoryNotFoundError } from '../errors';
import { paginate, type Page } from '../pagination';
import type { GenerationRow } from '../schema';
import type { Store } from '../store';

const TERMINAL_STATUSES: readonly GenerationStatus[] = ['succeeded', 'failed', 'cancelled'];
const IN_FLIGHT_STATUSES: readonly GenerationStatus[] = ['queued', 'running'];

/** data-model.md §3.4's two CHECK constraints. */
function assertCheckConstraints(row: GenerationRow): void {
  const editConsistent = (row.mode === 'edit') === (row.source_asset_id !== null);
  if (!editConsistent) {
    throw new CheckConstraintViolationError(
      'generations',
      "(mode='edit') = (source_asset_id IS NOT NULL)",
    );
  }

  const terminalConsistent =
    TERMINAL_STATUSES.includes(row.status) === (row.completed_at !== null);
  if (!terminalConsistent) {
    throw new CheckConstraintViolationError(
      'generations',
      "status IN ('succeeded','failed','cancelled') = (completed_at IS NOT NULL)",
    );
  }
}

export interface ListGenerationsQuery {
  projectId?: string;
  status?: GenerationStatus[];
  kind?: MediaKind;
  cursor?: string;
  limit: number;
}

/** data-model.md §4 ("…GenerationRepository … follow the same pattern"). Every finder takes
 * `userId` first. */
export interface GenerationRepository {
  create(row: GenerationRow): Promise<GenerationRow>;
  findById(userId: string, id: string): Promise<GenerationRow | null>;
  /**
   * Indexed query paths, data-model.md §3.4:
   * - filtered by `projectId` → `(project_id, created_at DESC)` (the history strip).
   * - unfiltered → `(user_id, created_at DESC)` (the all-projects feed).
   * - `status` filtering uses `(user_id, status)` (in-flight check, reconciliation sweep).
   */
  list(userId: string, query: ListGenerationsQuery): Promise<Page<GenerationRow>>;
  update(userId: string, id: string, patch: Partial<GenerationRow>): Promise<GenerationRow>;
  /** `queued + running` count — the concurrency gate, `plan.concurrency` (architecture.md §6.4
   * step 10), reads the `(user_id, status)` index path. */
  countInFlight(userId: string): Promise<number>;
  purgeByProject(userId: string, projectId: string): Promise<void>;
}

export function createGenerationRepository(store: Store): GenerationRepository {
  return {
    async create(row) {
      assertCheckConstraints(row);
      await store.mutate<GenerationRow>('generations', (rows) => [...rows, row]);
      return row;
    },

    async findById(userId, id) {
      const rows = await store.read<GenerationRow>('generations');
      return rows.find((row) => row.user_id === userId && row.id === id) ?? null;
    },

    async list(userId, query) {
      const rows = await store.read<GenerationRow>('generations');
      const statusSet = query.status ? new Set(query.status) : null;
      const scoped = rows.filter((row) => {
        if (row.user_id !== userId) return false;
        if (query.projectId !== undefined && row.project_id !== query.projectId) return false;
        if (query.kind !== undefined && row.kind !== query.kind) return false;
        if (statusSet && !statusSet.has(row.status)) return false;
        return true;
      });
      return paginate({
        rows: scoped,
        sortKey: (row) => row.created_at,
        id: (row) => row.id,
        direction: 'desc',
        cursor: query.cursor,
        limit: query.limit,
      });
    },

    async update(userId, id, patch) {
      let updated: GenerationRow | undefined;
      await store.mutate<GenerationRow>('generations', (rows) =>
        rows.map((row) => {
          if (row.user_id !== userId || row.id !== id) return row;
          const next: GenerationRow = { ...row, ...patch };
          assertCheckConstraints(next);
          updated = next;
          return next;
        }),
      );
      if (!updated) throw new RepositoryNotFoundError('generations', id);
      return updated;
    },

    async countInFlight(userId) {
      const rows = await store.read<GenerationRow>('generations');
      return rows.filter(
        (row) => row.user_id === userId && IN_FLIGHT_STATUSES.includes(row.status),
      ).length;
    },

    async purgeByProject(userId, projectId) {
      await store.mutate<GenerationRow>('generations', (rows) =>
        rows.filter((row) => !(row.user_id === userId && row.project_id === projectId)),
      );
    },
  };
}
