import { beforeEach, describe, expect, it } from 'vitest';

import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import {
  createAssetRepository,
  type AssetRepository,
} from '../../../../lib/server/db/repositories/assetRepository';
import type { AssetRow } from '../../../../lib/server/db/schema';

function asset(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: overrides.id ?? 'ast_1',
    user_id: overrides.user_id ?? 'usr_1',
    project_id: overrides.project_id ?? 'prj_1',
    generation_id: overrides.generation_id ?? 'gen_1',
    kind: overrides.kind ?? 'image',
    mime_type: overrides.mime_type ?? 'image/svg+xml',
    width: overrides.width ?? 1024,
    height: overrides.height ?? 1024,
    duration_seconds: overrides.duration_seconds ?? null,
    byte_size: overrides.byte_size ?? 4096,
    storage_key: overrides.storage_key ?? 'assets/ast_1.svg',
    checksum_sha256: overrides.checksum_sha256 ?? 'deadbeef',
    created_at: overrides.created_at ?? '2026-08-01T00:00:00.000Z',
  };
}

describe('AssetRepository', () => {
  let repo: AssetRepository;

  beforeEach(() => {
    repo = createAssetRepository(new MemoryStore());
  });

  it('refuses to return another user’s asset', async () => {
    await repo.create(asset({ id: 'ast_1', user_id: 'usr_1' }));
    await expect(repo.findById('usr_2', 'ast_1')).resolves.toBeNull();
  });

  it('listByGeneration returns only that generation’s assets for the caller', async () => {
    await repo.create(asset({ id: 'ast_1', generation_id: 'gen_1', user_id: 'usr_1' }));
    await repo.create(asset({ id: 'ast_2', generation_id: 'gen_2', user_id: 'usr_1' }));
    await repo.create(asset({ id: 'ast_3', generation_id: 'gen_1', user_id: 'usr_2' }));

    const results = await repo.listByGeneration('usr_1', 'gen_1');
    expect(results.map((row) => row.id)).toEqual(['ast_1']);
  });

  it('listByProject paginates newest-first', async () => {
    await repo.create(asset({ id: 'ast_1', project_id: 'prj_1', created_at: '2026-08-01T00:00:00.000Z' }));
    await repo.create(asset({ id: 'ast_2', project_id: 'prj_1', created_at: '2026-08-02T00:00:00.000Z' }));

    const page = await repo.listByProject('usr_1', 'prj_1', { limit: 30 });
    expect(page.items.map((row) => row.id)).toEqual(['ast_2', 'ast_1']);
  });

  it('purgeByProject removes only that user’s rows for that project', async () => {
    await repo.create(asset({ id: 'ast_1', user_id: 'usr_1', project_id: 'prj_1' }));
    await repo.create(asset({ id: 'ast_2', user_id: 'usr_2', project_id: 'prj_1' }));

    await repo.purgeByProject('usr_1', 'prj_1');

    await expect(repo.findById('usr_1', 'ast_1')).resolves.toBeNull();
    await expect(repo.findById('usr_2', 'ast_2')).resolves.not.toBeNull();
  });
});
