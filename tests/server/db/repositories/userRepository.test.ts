import { beforeEach, describe, expect, it } from 'vitest';

import { RepositoryNotFoundError, UniqueConstraintViolationError } from '../../../../lib/server/db/errors';
import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import { createUserRepository, type UserRepository } from '../../../../lib/server/db/repositories/userRepository';
import type { UserRow } from '../../../../lib/server/db/schema';

function user(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: overrides.id ?? 'usr_1',
    display_name: overrides.display_name ?? 'Explorer',
    email: overrides.email ?? null,
    created_at: overrides.created_at ?? '2026-08-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-08-01T00:00:00.000Z',
  };
}

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = createUserRepository(new MemoryStore());
  });

  it('creates and finds by id', async () => {
    await repo.create(user({ id: 'usr_1' }));
    await expect(repo.findById('usr_1')).resolves.toMatchObject({ id: 'usr_1' });
    await expect(repo.findById('usr_nope')).resolves.toBeNull();
  });

  it('allows multiple users with a null email', async () => {
    await repo.create(user({ id: 'usr_1', email: null }));
    await expect(repo.create(user({ id: 'usr_2', email: null }))).resolves.toMatchObject({
      id: 'usr_2',
    });
  });

  it('enforces UNIQUE(email) WHERE email IS NOT NULL on create', async () => {
    await repo.create(user({ id: 'usr_1', email: 'a@example.com' }));
    await expect(repo.create(user({ id: 'usr_2', email: 'a@example.com' }))).rejects.toThrow(
      UniqueConstraintViolationError,
    );
  });

  it('enforces the unique email constraint on update too', async () => {
    await repo.create(user({ id: 'usr_1', email: 'a@example.com' }));
    await repo.create(user({ id: 'usr_2', email: null }));
    await expect(repo.update('usr_2', { email: 'a@example.com' })).rejects.toThrow(
      UniqueConstraintViolationError,
    );
  });

  it('update throws RepositoryNotFoundError for a missing id', async () => {
    await expect(repo.update('usr_missing', { display_name: 'X' })).rejects.toThrow(
      RepositoryNotFoundError,
    );
  });

  it('findByEmail finds the matching row', async () => {
    await repo.create(user({ id: 'usr_1', email: 'a@example.com' }));
    await expect(repo.findByEmail('a@example.com')).resolves.toMatchObject({ id: 'usr_1' });
    await expect(repo.findByEmail('missing@example.com')).resolves.toBeNull();
  });
});
