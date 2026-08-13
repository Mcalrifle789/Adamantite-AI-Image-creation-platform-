import 'server-only';

import { paginate, type Page } from '../pagination';
import type { AssetRow } from '../schema';
import type { Store } from '../store';

export interface ListAssetsByProjectQuery {
  cursor?: string;
  limit: number;
}

/**
 * data-model.md §4 pattern. Every finder takes `userId` first. No `update` method exists —
 * asset bytes and metadata are immutable once written (data-model.md §3.5: "asset bytes are
 * never rewritten. An edit produces a *new* asset."); a "correction" is always a new row.
 */
export interface AssetRepository {
  create(row: AssetRow): Promise<AssetRow>;
  findById(userId: string, id: string): Promise<AssetRow | null>;
  /** Indexed query path `(generation_id)` — data-model.md §3.5. */
  listByGeneration(userId: string, generationId: string): Promise<AssetRow[]>;
  /** Indexed query path `(project_id, created_at DESC)` — data-model.md §3.5. */
  listByProject(userId: string, projectId: string, query: ListAssetsByProjectQuery): Promise<Page<AssetRow>>;
  purgeByProject(userId: string, projectId: string): Promise<void>;
}

export function createAssetRepository(store: Store): AssetRepository {
  return {
    async create(row) {
      await store.mutate<AssetRow>('assets', (rows) => [...rows, row]);
      return row;
    },

    async findById(userId, id) {
      const rows = await store.read<AssetRow>('assets');
      return rows.find((row) => row.user_id === userId && row.id === id) ?? null;
    },

    async listByGeneration(userId, generationId) {
      const rows = await store.read<AssetRow>('assets');
      return rows
        .filter((row) => row.user_id === userId && row.generation_id === generationId)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
    },

    async listByProject(userId, projectId, query) {
      const rows = await store.read<AssetRow>('assets');
      const scoped = rows.filter((row) => row.user_id === userId && row.project_id === projectId);
      return paginate({
        rows: scoped,
        sortKey: (row) => row.created_at,
        id: (row) => row.id,
        direction: 'desc',
        cursor: query.cursor,
        limit: query.limit,
      });
    },

    async purgeByProject(userId, projectId) {
      await store.mutate<AssetRow>('assets', (rows) =>
        rows.filter((row) => !(row.user_id === userId && row.project_id === projectId)),
      );
    },
  };
}
