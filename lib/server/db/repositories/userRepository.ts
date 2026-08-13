import 'server-only';

import { RepositoryNotFoundError, UniqueConstraintViolationError } from '../errors';
import type { UserRow } from '../schema';
import type { Store } from '../store';

/**
 * data-model.md §3.1: `UNIQUE(email) WHERE email IS NOT NULL`. `findById`/`update` take the
 * user's own `id` as their sole identifying argument rather than a separate `userId` + `id`
 * pair — for this one repository the entity *is* the user, so there is no second user's row a
 * call could ever resolve to; the "every finder takes userId first" structural guarantee
 * (data-model.md §4) holds trivially rather than needing a second parameter.
 */
export interface UserRepository {
  create(row: UserRow): Promise<UserRow>;
  findById(id: string): Promise<UserRow | null>;
  findByEmail(email: string): Promise<UserRow | null>;
  update(id: string, patch: Partial<UserRow>): Promise<UserRow>;
}

function assertUniqueEmail(rows: UserRow[], email: string | null, excludeId?: string): void {
  if (email === null) return;
  const conflict = rows.some((row) => row.id !== excludeId && row.email === email);
  if (conflict) {
    throw new UniqueConstraintViolationError('users', 'UNIQUE(email) WHERE email IS NOT NULL');
  }
}

export function createUserRepository(store: Store): UserRepository {
  return {
    async create(row) {
      await store.mutate<UserRow>('users', (rows) => {
        assertUniqueEmail(rows, row.email);
        return [...rows, row];
      });
      return row;
    },

    async findById(id) {
      const rows = await store.read<UserRow>('users');
      return rows.find((row) => row.id === id) ?? null;
    },

    async findByEmail(email) {
      const rows = await store.read<UserRow>('users');
      return rows.find((row) => row.email === email) ?? null;
    },

    async update(id, patch) {
      let updated: UserRow | undefined;
      await store.mutate<UserRow>('users', (rows) => {
        if (patch.email !== undefined) assertUniqueEmail(rows, patch.email, id);
        return rows.map((row) => {
          if (row.id !== id) return row;
          updated = { ...row, ...patch };
          return updated;
        });
      });
      if (!updated) throw new RepositoryNotFoundError('users', id);
      return updated;
    },
  };
}
