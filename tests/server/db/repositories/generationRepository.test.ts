import { beforeEach, describe, expect, it } from 'vitest';

import { CheckConstraintViolationError } from '../../../../lib/server/db/errors';
import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import {
  createGenerationRepository,
  type GenerationRepository,
} from '../../../../lib/server/db/repositories/generationRepository';
import type { GenerationRow } from '../../../../lib/server/db/schema';

function generation(overrides: Partial<GenerationRow> = {}): GenerationRow {
  return {
    id: overrides.id ?? 'gen_1',
    user_id: overrides.user_id ?? 'usr_1',
    project_id: overrides.project_id ?? 'prj_1',
    model_id: overrides.model_id ?? 'nano-banana-2',
    model_display_name: overrides.model_display_name ?? 'Nano Banana 2',
    model_tier: overrides.model_tier ?? 'premium',
    kind: overrides.kind ?? 'image',
    mode: overrides.mode ?? 'create',
    prompt: overrides.prompt ?? 'a field of blue squares',
    aspect_ratio: overrides.aspect_ratio ?? '1:1',
    seed: overrides.seed ?? 42,
    duration_seconds: overrides.duration_seconds ?? null,
    source_asset_id: overrides.source_asset_id ?? null,
    status: overrides.status ?? 'queued',
    progress: overrides.progress ?? 0,
    price_credits: overrides.price_credits ?? 600,
    estimated_seconds: overrides.estimated_seconds ?? 5,
    provider_id: overrides.provider_id ?? 'mock',
    provider_job_id: overrides.provider_job_id ?? null,
    timeline_seed: overrides.timeline_seed ?? 1,
    error_code: overrides.error_code ?? null,
    error_message: overrides.error_message ?? null,
    error_retriable: overrides.error_retriable ?? null,
    retry_of_id: overrides.retry_of_id ?? null,
    result_message_id: overrides.result_message_id ?? null,
    created_at: overrides.created_at ?? '2026-08-01T00:00:00.000Z',
    started_at: overrides.started_at ?? null,
    completed_at: overrides.completed_at ?? null,
  };
}

describe('GenerationRepository', () => {
  let repo: GenerationRepository;

  beforeEach(() => {
    repo = createGenerationRepository(new MemoryStore());
  });

  it('enforces (mode=edit) = (source_asset_id IS NOT NULL) on create', async () => {
    await expect(
      repo.create(generation({ mode: 'edit', source_asset_id: null })),
    ).rejects.toThrow(CheckConstraintViolationError);
    await expect(
      repo.create(generation({ mode: 'create', source_asset_id: 'ast_1' })),
    ).rejects.toThrow(CheckConstraintViolationError);

    await expect(
      repo.create(generation({ id: 'gen_ok', mode: 'edit', source_asset_id: 'ast_1' })),
    ).resolves.toMatchObject({ id: 'gen_ok' });
  });

  it('enforces terminal status = (completed_at IS NOT NULL) on create and update', async () => {
    await expect(
      repo.create(generation({ status: 'succeeded', completed_at: null })),
    ).rejects.toThrow(CheckConstraintViolationError);
    await expect(
      repo.create(generation({ status: 'queued', completed_at: '2026-08-01T00:00:00.000Z' })),
    ).rejects.toThrow(CheckConstraintViolationError);

    await repo.create(generation({ id: 'gen_1', status: 'queued', completed_at: null }));
    await expect(
      repo.update('usr_1', 'gen_1', { status: 'succeeded', completed_at: null }),
    ).rejects.toThrow(CheckConstraintViolationError);

    await expect(
      repo.update('usr_1', 'gen_1', {
        status: 'succeeded',
        completed_at: '2026-08-01T00:05:00.000Z',
      }),
    ).resolves.toMatchObject({ status: 'succeeded' });
  });

  it('refuses to return another user’s generation', async () => {
    await repo.create(generation({ id: 'gen_1', user_id: 'usr_1' }));
    await expect(repo.findById('usr_2', 'gen_1')).resolves.toBeNull();
  });

  it('countInFlight counts only queued + running for the given user — the concurrency gate', async () => {
    await repo.create(generation({ id: 'gen_1', user_id: 'usr_1', status: 'queued' }));
    await repo.create(generation({ id: 'gen_2', user_id: 'usr_1', status: 'running' }));
    await repo.create(
      generation({
        id: 'gen_3',
        user_id: 'usr_1',
        status: 'succeeded',
        completed_at: '2026-08-01T00:05:00.000Z',
      }),
    );
    await repo.create(generation({ id: 'gen_4', user_id: 'usr_2', status: 'queued' }));

    await expect(repo.countInFlight('usr_1')).resolves.toBe(2);
    await expect(repo.countInFlight('usr_2')).resolves.toBe(1);
  });

  it('lists by project, newest-first — the history strip index path', async () => {
    await repo.create(
      generation({ id: 'gen_1', project_id: 'prj_1', created_at: '2026-08-01T00:00:00.000Z' }),
    );
    await repo.create(
      generation({ id: 'gen_2', project_id: 'prj_1', created_at: '2026-08-03T00:00:00.000Z' }),
    );
    await repo.create(
      generation({ id: 'gen_3', project_id: 'prj_2', created_at: '2026-08-02T00:00:00.000Z' }),
    );

    const page = await repo.list('usr_1', { projectId: 'prj_1', limit: 30 });
    expect(page.items.map((row) => row.id)).toEqual(['gen_2', 'gen_1']);
  });

  it('filters by status and kind together', async () => {
    await repo.create(generation({ id: 'gen_1', status: 'queued', kind: 'image' }));
    await repo.create(generation({ id: 'gen_2', status: 'running', kind: 'video' }));
    await repo.create(
      generation({
        id: 'gen_3',
        status: 'succeeded',
        kind: 'image',
        completed_at: '2026-08-01T00:05:00.000Z',
      }),
    );

    const page = await repo.list('usr_1', {
      status: ['queued', 'running'],
      kind: 'video',
      limit: 30,
    });
    expect(page.items.map((row) => row.id)).toEqual(['gen_2']);
  });
});
