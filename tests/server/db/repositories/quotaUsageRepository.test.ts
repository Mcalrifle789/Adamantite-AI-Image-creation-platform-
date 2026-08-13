import { beforeEach, describe, expect, it } from 'vitest';

import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import {
  createQuotaUsageRepository,
  type QuotaUsageRepository,
} from '../../../../lib/server/db/repositories/quotaUsageRepository';
import type { QuotaUsageRow } from '../../../../lib/server/db/schema';

function quotaUsage(overrides: Partial<QuotaUsageRow> = {}): QuotaUsageRow {
  return {
    user_id: overrides.user_id ?? 'usr_1',
    period_start: overrides.period_start ?? '2026-08-01T00:00:00.000Z',
    period_end: overrides.period_end ?? '2026-09-01T00:00:00.000Z',
    plan_id: overrides.plan_id ?? 'port',
    granted_credits: overrides.granted_credits ?? 39_950,
    used_credits: overrides.used_credits ?? 0,
    reserved_credits: overrides.reserved_credits ?? 0,
    balance_credits: overrides.balance_credits ?? 39_950,
    counts: overrides.counts ?? {},
    updated_at: overrides.updated_at ?? '2026-08-01T00:00:00.000Z',
  };
}

describe('QuotaUsageRepository', () => {
  let repo: QuotaUsageRepository;

  beforeEach(() => {
    repo = createQuotaUsageRepository(new MemoryStore());
  });

  it('find returns null when no row exists for the (user, period) pair', async () => {
    await expect(repo.find('usr_1', '2026-08-01T00:00:00.000Z')).resolves.toBeNull();
  });

  it('upsert inserts a new row for a fresh (user_id, period_start) key', async () => {
    await repo.upsert(quotaUsage());
    await expect(repo.find('usr_1', '2026-08-01T00:00:00.000Z')).resolves.toMatchObject({
      granted_credits: 39_950,
    });
  });

  it('upsert replaces the existing row for the same primary key rather than duplicating it', async () => {
    await repo.upsert(quotaUsage({ balance_credits: 39_950, used_credits: 0 }));
    await repo.upsert(quotaUsage({ balance_credits: 39_350, used_credits: 600 }));

    const rows = await repo.listByUser('usr_1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ balance_credits: 39_350, used_credits: 600 });
  });

  it('listByUser only returns the given user’s rows, across periods', async () => {
    await repo.upsert(quotaUsage({ user_id: 'usr_1', period_start: '2026-08-01T00:00:00.000Z' }));
    await repo.upsert(quotaUsage({ user_id: 'usr_1', period_start: '2026-09-01T00:00:00.000Z' }));
    await repo.upsert(quotaUsage({ user_id: 'usr_2', period_start: '2026-08-01T00:00:00.000Z' }));

    const rows = await repo.listByUser('usr_1');
    expect(rows).toHaveLength(2);
  });
});
