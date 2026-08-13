import { beforeEach, describe, expect, it } from 'vitest';

import { UniqueConstraintViolationError } from '../../../../lib/server/db/errors';
import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import {
  createIdempotencyRepository,
  type IdempotencyRepository,
} from '../../../../lib/server/db/repositories/idempotencyRepository';
import type { IdempotencyRow } from '../../../../lib/server/db/schema';

function idempotencyRow(overrides: Partial<IdempotencyRow> = {}): IdempotencyRow {
  return {
    user_id: overrides.user_id ?? 'usr_1',
    key: overrides.key ?? '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    route: overrides.route ?? 'POST /api/generations',
    request_hash: overrides.request_hash ?? 'hash1',
    status_code: overrides.status_code ?? 202,
    response_json: overrides.response_json ?? '{"id":"gen_1"}',
    created_at: overrides.created_at ?? '2026-08-01T00:00:00.000Z',
  };
}

describe('IdempotencyRepository', () => {
  let repo: IdempotencyRepository;

  beforeEach(() => {
    repo = createIdempotencyRepository(new MemoryStore());
  });

  it('finds by (user_id, key)', async () => {
    await repo.create(idempotencyRow());
    await expect(
      repo.find('usr_1', '3fa85f64-5717-4562-b3fc-2c963f66afa6'),
    ).resolves.toMatchObject({ status_code: 202 });
    await expect(repo.find('usr_2', '3fa85f64-5717-4562-b3fc-2c963f66afa6')).resolves.toBeNull();
  });

  it('enforces the (user_id, key) primary key on create', async () => {
    await repo.create(idempotencyRow());
    await expect(repo.create(idempotencyRow({ request_hash: 'hash2' }))).rejects.toThrow(
      UniqueConstraintViolationError,
    );
  });

  it('allows the same key for two different users', async () => {
    await repo.create(idempotencyRow({ user_id: 'usr_1' }));
    await expect(repo.create(idempotencyRow({ user_id: 'usr_2' }))).resolves.toMatchObject({
      user_id: 'usr_2',
    });
  });

  it('deleteOlderThan sweeps rows created before the cutoff and returns the removed count', async () => {
    await repo.create(idempotencyRow({ key: 'key-old', created_at: '2026-08-01T00:00:00.000Z' }));
    await repo.create(idempotencyRow({ key: 'key-new', created_at: '2026-08-02T00:00:00.000Z' }));

    const removed = await repo.deleteOlderThan('2026-08-01T12:00:00.000Z');
    expect(removed).toBe(1);
    await expect(repo.find('usr_1', 'key-old')).resolves.toBeNull();
    await expect(repo.find('usr_1', 'key-new')).resolves.not.toBeNull();
  });
});
