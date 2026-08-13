import { beforeEach, describe, expect, it } from 'vitest';

import { RepositoryNotFoundError, UniqueConstraintViolationError } from '../../../../lib/server/db/errors';
import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import {
  createSubscriptionRepository,
  type SubscriptionRepository,
} from '../../../../lib/server/db/repositories/subscriptionRepository';
import type { SubscriptionRow } from '../../../../lib/server/db/schema';

function subscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: overrides.id ?? 'sub_1',
    user_id: overrides.user_id ?? 'usr_1',
    plan_id: overrides.plan_id ?? 'port',
    status: overrides.status ?? 'active',
    current_period_start: overrides.current_period_start ?? '2026-08-01T00:00:00.000Z',
    current_period_end: overrides.current_period_end ?? '2026-09-01T00:00:00.000Z',
    created_at: overrides.created_at ?? '2026-08-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-08-01T00:00:00.000Z',
  };
}

describe('SubscriptionRepository', () => {
  let repo: SubscriptionRepository;

  beforeEach(() => {
    repo = createSubscriptionRepository(new MemoryStore());
  });

  it('creates and finds by user id', async () => {
    await repo.create(subscription({ user_id: 'usr_1' }));
    await expect(repo.findByUserId('usr_1')).resolves.toMatchObject({ plan_id: 'port' });
    await expect(repo.findByUserId('usr_2')).resolves.toBeNull();
  });

  it('enforces UNIQUE(user_id) — exactly one subscription per user', async () => {
    await repo.create(subscription({ id: 'sub_1', user_id: 'usr_1' }));
    await expect(repo.create(subscription({ id: 'sub_2', user_id: 'usr_1' }))).rejects.toThrow(
      UniqueConstraintViolationError,
    );
  });

  it('update mutates the plan (plan change / period rollover)', async () => {
    await repo.create(subscription({ user_id: 'usr_1', plan_id: 'port' }));
    await expect(
      repo.update('usr_1', { plan_id: 'pro', current_period_start: '2026-09-01T00:00:00.000Z' }),
    ).resolves.toMatchObject({ plan_id: 'pro' });
  });

  it('update on a user with no subscription throws RepositoryNotFoundError', async () => {
    await expect(repo.update('usr_missing', { plan_id: 'pro' })).rejects.toThrow(
      RepositoryNotFoundError,
    );
  });
});
