import { beforeEach, describe, expect, it } from 'vitest';

import { LedgerConflictError } from '../../../../lib/server/db/errors';
import { MemoryStore } from '../../../../lib/server/db/memoryStore';
import {
  createLedgerRepository,
  type LedgerRepository,
} from '../../../../lib/server/db/repositories/ledgerRepository';
import type { LedgerRow } from '../../../../lib/server/db/schema';

function entry(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    id: overrides.id ?? 'led_1',
    user_id: overrides.user_id ?? 'usr_1',
    period_start: overrides.period_start ?? '2026-08-01T00:00:00.000Z',
    kind: overrides.kind ?? 'grant',
    delta_credits: overrides.delta_credits ?? 39_950,
    balance_after: overrides.balance_after ?? 39_950,
    reason: overrides.reason ?? 'period_rollover',
    generation_id: overrides.generation_id ?? null,
    idempotency_key: overrides.idempotency_key ?? null,
    created_at: overrides.created_at ?? '2026-08-01T00:00:00.000Z',
  };
}

describe('LedgerRepository', () => {
  let repo: LedgerRepository;

  beforeEach(() => {
    repo = createLedgerRepository(new MemoryStore());
  });

  it('is structurally append-only: the interface exposes no update or delete method', () => {
    expect('update' in repo).toBe(false);
    expect('delete' in repo).toBe(false);
    expect('remove' in repo).toBe(false);
  });

  it('appends an entry and returns it', async () => {
    await expect(repo.append(entry())).resolves.toMatchObject({ id: 'led_1' });
  });

  it('throws LedgerConflictError on a second debit_reserve for the same (user, generation) — the double-charge guard', async () => {
    await repo.append(
      entry({ id: 'led_1', kind: 'debit_reserve', generation_id: 'gen_1', delta_credits: -600 }),
    );

    await expect(
      repo.append(
        entry({ id: 'led_2', kind: 'debit_reserve', generation_id: 'gen_1', delta_credits: -600 }),
      ),
    ).rejects.toThrow(LedgerConflictError);

    // Nothing was written by the rejected append.
    await expect(repo.hasEntry('usr_1', 'gen_1', 'debit_reserve')).resolves.toBe(true);
    const page = await repo.list('usr_1', { limit: 30 });
    expect(page.items).toHaveLength(1);
  });

  it('allows a debit_reserve AND a refund for the same generation — different kinds do not collide', async () => {
    await repo.append(
      entry({ id: 'led_1', kind: 'debit_reserve', generation_id: 'gen_1', delta_credits: -600 }),
    );
    await expect(
      repo.append(
        entry({ id: 'led_2', kind: 'refund', generation_id: 'gen_1', delta_credits: 600 }),
      ),
    ).resolves.toMatchObject({ id: 'led_2' });
  });

  it('does not treat two null-generation_id entries (e.g. two grants) as colliding — SQL NULL semantics', async () => {
    await repo.append(
      entry({ id: 'led_1', kind: 'grant', generation_id: null, period_start: '2026-08-01T00:00:00.000Z' }),
    );
    await expect(
      repo.append(
        entry({ id: 'led_2', kind: 'grant', generation_id: null, period_start: '2026-09-01T00:00:00.000Z' }),
      ),
    ).resolves.toMatchObject({ id: 'led_2' });
  });

  it('the conflict check is scoped per user — two different users may each debit_reserve a like-named generation id independently', async () => {
    await repo.append(
      entry({ id: 'led_1', user_id: 'usr_1', kind: 'debit_reserve', generation_id: 'gen_shared', delta_credits: -600 }),
    );
    await expect(
      repo.append(
        entry({ id: 'led_2', user_id: 'usr_2', kind: 'debit_reserve', generation_id: 'gen_shared', delta_credits: -600 }),
      ),
    ).resolves.toMatchObject({ id: 'led_2' });
  });

  it('sumForPeriod sums delta_credits for the user and period only', async () => {
    await repo.append(entry({ id: 'led_1', period_start: '2026-08-01T00:00:00.000Z', delta_credits: 39_950 }));
    await repo.append(
      entry({
        id: 'led_2',
        kind: 'debit_reserve',
        generation_id: 'gen_1',
        period_start: '2026-08-01T00:00:00.000Z',
        delta_credits: -600,
      }),
    );
    await repo.append(
      entry({ id: 'led_3', user_id: 'usr_2', period_start: '2026-08-01T00:00:00.000Z', delta_credits: 79_950 }),
    );
    await repo.append(entry({ id: 'led_4', period_start: '2026-09-01T00:00:00.000Z', delta_credits: 39_950 }));

    await expect(repo.sumForPeriod('usr_1', '2026-08-01T00:00:00.000Z')).resolves.toBe(39_350);
  });

  it('list returns newest-first and respects periodStart filtering', async () => {
    await repo.append(entry({ id: 'led_1', period_start: '2026-08-01T00:00:00.000Z', created_at: '2026-08-01T00:00:00.000Z' }));
    await repo.append(entry({ id: 'led_2', period_start: '2026-09-01T00:00:00.000Z', created_at: '2026-09-01T00:00:00.000Z' }));

    const augustOnly = await repo.list('usr_1', { periodStart: '2026-08-01T00:00:00.000Z', limit: 30 });
    expect(augustOnly.items.map((row) => row.id)).toEqual(['led_1']);

    const all = await repo.list('usr_1', { limit: 30 });
    expect(all.items.map((row) => row.id)).toEqual(['led_2', 'led_1']);
  });
});
