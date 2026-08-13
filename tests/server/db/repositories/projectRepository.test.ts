import { beforeEach, describe, expect, it } from 'vitest';

import { CheckConstraintViolationError, RepositoryNotFoundError } from '../../../../lib/server/db/errors';
import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import { createProjectRepository, type ProjectRepository } from '../../../../lib/server/db/repositories/projectRepository';
import type { ProjectRow } from '../../../../lib/server/db/schema';

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: overrides.id ?? 'prj_1',
    user_id: overrides.user_id ?? 'usr_1',
    name: overrides.name ?? 'First light',
    status: overrides.status ?? 'active',
    default_model_id: overrides.default_model_id ?? null,
    initial_prompt: overrides.initial_prompt ?? null,
    cover_asset_id: overrides.cover_asset_id ?? null,
    duplicated_from_id: overrides.duplicated_from_id ?? null,
    created_at: overrides.created_at ?? '2026-08-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-08-01T00:00:00.000Z',
    trashed_at: overrides.trashed_at ?? null,
  };
}

describe('ProjectRepository', () => {
  let repo: ProjectRepository;

  beforeEach(() => {
    repo = createProjectRepository(new MemoryStore());
  });

  it('creates and finds a project scoped to its owner', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1' }));
    await expect(repo.findById('usr_1', 'prj_1')).resolves.toMatchObject({ id: 'prj_1' });
  });

  it('refuses to return another user’s row — findById is userId-scoped', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1' }));
    await expect(repo.findById('usr_2', 'prj_1')).resolves.toBeNull();
  });

  it('refuses to return another user’s row — list only ever returns the caller’s own rows', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1' }));
    await repo.create(project({ id: 'prj_2', user_id: 'usr_2' }));

    const page = await repo.list('usr_1', { status: 'active', limit: 30 });
    expect(page.items.map((row) => row.id)).toEqual(['prj_1']);
  });

  it('update on another user’s project id is a no-op-turned-not-found, never a cross-user write', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1', name: 'Original' }));
    await expect(repo.update('usr_2', 'prj_1', { name: 'Hijacked' })).rejects.toThrow(
      RepositoryNotFoundError,
    );
    await expect(repo.findById('usr_1', 'prj_1')).resolves.toMatchObject({ name: 'Original' });
  });

  it('enforces the CHECK constraint: status=trashed iff trashed_at is set, on create', async () => {
    await expect(
      repo.create(project({ status: 'trashed', trashed_at: null })),
    ).rejects.toThrow(CheckConstraintViolationError);
    await expect(
      repo.create(project({ status: 'active', trashed_at: '2026-08-01T00:00:00.000Z' })),
    ).rejects.toThrow(CheckConstraintViolationError);
  });

  it('enforces the CHECK constraint on update', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1' }));
    await expect(
      repo.update('usr_1', 'prj_1', { status: 'trashed', trashed_at: null }),
    ).rejects.toThrow(CheckConstraintViolationError);
  });

  it('lists active projects ordered by updated_at DESC — the rail query', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1', updated_at: '2026-08-01T00:00:00.000Z' }));
    await repo.create(project({ id: 'prj_2', user_id: 'usr_1', updated_at: '2026-08-03T00:00:00.000Z' }));
    await repo.create(project({ id: 'prj_3', user_id: 'usr_1', updated_at: '2026-08-02T00:00:00.000Z' }));

    const page = await repo.list('usr_1', { status: 'active', limit: 30 });
    expect(page.items.map((row) => row.id)).toEqual(['prj_2', 'prj_3', 'prj_1']);
  });

  it('list filters by status', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1', status: 'active' }));
    await repo.create(
      project({ id: 'prj_2', user_id: 'usr_1', status: 'trashed', trashed_at: '2026-08-01T00:00:00.000Z' }),
    );

    const active = await repo.list('usr_1', { status: 'active', limit: 30 });
    expect(active.items.map((row) => row.id)).toEqual(['prj_1']);

    const trashed = await repo.list('usr_1', { status: 'trashed', limit: 30 });
    expect(trashed.items.map((row) => row.id)).toEqual(['prj_2']);
  });

  it('countActive counts active AND trashed rows toward the 200-project cap', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1', status: 'active' }));
    await repo.create(
      project({ id: 'prj_2', user_id: 'usr_1', status: 'trashed', trashed_at: '2026-08-01T00:00:00.000Z' }),
    );
    await repo.create(project({ id: 'prj_3', user_id: 'usr_2', status: 'active' }));

    await expect(repo.countActive('usr_1')).resolves.toBe(2);
    await expect(repo.countActive('usr_2')).resolves.toBe(1);
  });

  it('purge removes only the targeted user\'s row', async () => {
    await repo.create(project({ id: 'prj_1', user_id: 'usr_1' }));
    await repo.purge('usr_2', 'prj_1');
    await expect(repo.findById('usr_1', 'prj_1')).resolves.not.toBeNull();

    await repo.purge('usr_1', 'prj_1');
    await expect(repo.findById('usr_1', 'prj_1')).resolves.toBeNull();
  });
});
