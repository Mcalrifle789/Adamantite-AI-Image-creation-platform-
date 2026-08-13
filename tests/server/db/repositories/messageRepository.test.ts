import { beforeEach, describe, expect, it } from 'vitest';

import { CheckConstraintViolationError } from '../../../../lib/server/db/errors';
import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import {
  createMessageRepository,
  type MessageRepository,
} from '../../../../lib/server/db/repositories/messageRepository';
import type { MessageRow } from '../../../../lib/server/db/schema';

function message(overrides: Partial<MessageRow> = {}): MessageRow {
  return {
    id: overrides.id ?? 'msg_1',
    user_id: overrides.user_id ?? 'usr_1',
    project_id: overrides.project_id ?? 'prj_1',
    role: overrides.role ?? 'user',
    content: overrides.content ?? 'Make it bluer',
    status: overrides.status ?? 'complete',
    generation_id: overrides.generation_id ?? null,
    attachment_asset_ids: overrides.attachment_asset_ids ?? [],
    created_at: overrides.created_at ?? '2026-08-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-08-01T00:00:00.000Z',
  };
}

describe('MessageRepository', () => {
  let repo: MessageRepository;

  beforeEach(() => {
    repo = createMessageRepository(new MemoryStore());
  });

  it('enforces CHECK (role=assistant OR status=complete) — user messages are never pending', async () => {
    await expect(
      repo.create(message({ role: 'user', status: 'pending' })),
    ).rejects.toThrow(CheckConstraintViolationError);

    await expect(
      repo.create(message({ id: 'msg_ok', role: 'assistant', status: 'pending', content: '' })),
    ).resolves.toMatchObject({ id: 'msg_ok' });
  });

  it('enforces the constraint on update too', async () => {
    await repo.create(message({ id: 'msg_1', role: 'user', status: 'complete' }));
    await expect(repo.update('usr_1', 'msg_1', { status: 'pending' })).rejects.toThrow(
      CheckConstraintViolationError,
    );
  });

  it('refuses to return another user’s message', async () => {
    await repo.create(message({ id: 'msg_1', user_id: 'usr_1' }));
    await expect(repo.findById('usr_2', 'msg_1')).resolves.toBeNull();
  });

  it('lists chronologically ASC — the reading order index path', async () => {
    await repo.create(message({ id: 'msg_1', created_at: '2026-08-01T00:02:00.000Z' }));
    await repo.create(message({ id: 'msg_2', created_at: '2026-08-01T00:01:00.000Z' }));
    await repo.create(message({ id: 'msg_3', created_at: '2026-08-01T00:03:00.000Z' }));

    const page = await repo.listByProject('usr_1', 'prj_1', { limit: 30 });
    expect(page.items.map((row) => row.id)).toEqual(['msg_2', 'msg_1', 'msg_3']);
  });

  it('completing a pending assistant message updates content and status', async () => {
    await repo.create(
      message({ id: 'msg_1', role: 'assistant', status: 'pending', content: '' }),
    );
    await expect(
      repo.update('usr_1', 'msg_1', { status: 'complete', content: 'Done!' }),
    ).resolves.toMatchObject({ status: 'complete', content: 'Done!' });
  });
});
