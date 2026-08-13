import './testEnvSetup';

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLANS } from '../../../config/plans';
import { fixedClock } from '../../../lib/server/clock';
import { JsonStore } from '../../../lib/server/db/jsonStore';
import { MemoryStore } from '../../../lib/server/db/memoryStore';
import type {
  LedgerRow,
  ProjectRow,
  SubscriptionRow,
  UserRow,
} from '../../../lib/server/db/schema';
import { main, runSeed, wipeDataDir } from '../../../lib/server/db/seed';

const clock = fixedClock('2026-08-12T05:00:00.000Z');

describe('runSeed', () => {
  it('creates exactly the fixture data-model.md §5 specifies', async () => {
    const store = new MemoryStore();
    const result = await runSeed(store, clock);

    expect(result.seeded).toBe(true);

    const users = await store.read<UserRow>('users');
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ display_name: 'Explorer', email: null });

    const subscriptions = await store.read<SubscriptionRow>('subscriptions');
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).toMatchObject({
      user_id: users[0]?.id,
      plan_id: 'port',
      status: 'active',
      current_period_start: '2026-08-01T00:00:00.000Z',
      current_period_end: '2026-09-01T00:00:00.000Z',
    });

    const ledgerEntries = await store.read<LedgerRow>('credit_ledger');
    expect(ledgerEntries).toHaveLength(1);
    expect(ledgerEntries[0]).toMatchObject({
      user_id: users[0]?.id,
      kind: 'grant',
      delta_credits: PLANS.port.monthlyCredits,
      balance_after: PLANS.port.monthlyCredits,
      reason: 'period_rollover',
      generation_id: null,
    });
    expect(ledgerEntries[0]?.delta_credits).toBe(39_950);

    const projects = await store.read<ProjectRow>('projects');
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      user_id: users[0]?.id,
      name: 'First light',
      status: 'active',
      trashed_at: null,
    });
    expect(projects[0]?.initial_prompt).toBeTruthy();

    const generations = await store.read('generations');
    expect(generations).toHaveLength(0);
  });

  it('is idempotent: a second call is a no-op when rows already exist', async () => {
    const store = new MemoryStore();
    await runSeed(store, clock);

    const second = await runSeed(store, clock);
    expect(second.seeded).toBe(false);

    const users = await store.read<UserRow>('users');
    expect(users).toHaveLength(1);
  });

  it('never calls the wall clock directly — every timestamp comes from the injected Clock', async () => {
    const store = new MemoryStore();
    const laterClock = fixedClock('2030-01-15T12:00:00.000Z');
    await runSeed(store, laterClock);

    const users = await store.read<UserRow>('users');
    expect(users[0]?.created_at).toBe('2030-01-15T12:00:00.000Z');

    const subscriptions = await store.read<SubscriptionRow>('subscriptions');
    expect(subscriptions[0]?.current_period_start).toBe('2030-01-01T00:00:00.000Z');
    expect(subscriptions[0]?.current_period_end).toBe('2030-02-01T00:00:00.000Z');
  });
});

describe('main() — the npm run seed:reset CLI entrypoint', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('refuses to run when NODE_ENV=production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await main();
    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('refusing to run'));
  });
});

describe('wipeDataDir + JsonStore — the --reset behaviour', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await fs.mkdtemp(path.join(tmpdir(), 'adamantite-seed-reset-'));
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('wipeDataDir removes the entire resolved data directory from disk', async () => {
    const store = new JsonStore(dataDir);
    await runSeed(store, clock);
    await expect(store.read<UserRow>('users')).resolves.toHaveLength(1);
    await expect(fs.access(path.join(dataDir, 'users.json'))).resolves.toBeUndefined();

    await wipeDataDir(dataDir);
    await expect(fs.access(dataDir)).rejects.toThrow();
  });

  it('a fresh JsonStore over a newly-emptied directory (the post-wipe state) reseeds cleanly', async () => {
    // A separate directory stands in for "the same directory, after wipe, in a fresh process" —
    // JsonStore's read cache is intentionally pinned to globalThis per resolved directory (so it
    // survives Next.js hot reload), which means *within one process* re-pointing a new instance
    // at a directory that was wiped out from under an earlier instance would still see that
    // instance's warm cache. That never happens for the real `--reset` flow: `npm run
    // seed:reset` is a fresh `node` process every time, so there is no warm cache to begin with
    // — this test exercises exactly that cold-start condition instead of the in-process replay.
    const coldStore = new JsonStore(dataDir);
    const result = await runSeed(coldStore, clock);
    expect(result.seeded).toBe(true);
    await expect(coldStore.read<UserRow>('users')).resolves.toHaveLength(1);
  });
});
