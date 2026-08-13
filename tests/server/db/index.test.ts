import { INDEX_TEST_DATA_DIR } from './indexTestEnvSetup';

import { promises as fs } from 'node:fs';

import { afterAll, describe, expect, it } from 'vitest';

import { createRepositories, getRepositories } from '../../../lib/server/db';
import { MemoryStore } from '../../../lib/server/db/memoryStore';
import type { UserRow } from '../../../lib/server/db/schema';

afterAll(async () => {
  await fs.rm(INDEX_TEST_DATA_DIR, { recursive: true, force: true });
});

describe('createRepositories', () => {
  it('builds all nine repositories from any Store — the migration seam', () => {
    const repos = createRepositories(new MemoryStore());

    expect(repos.users).toBeDefined();
    expect(repos.subscriptions).toBeDefined();
    expect(repos.projects).toBeDefined();
    expect(repos.generations).toBeDefined();
    expect(repos.assets).toBeDefined();
    expect(repos.messages).toBeDefined();
    expect(repos.ledger).toBeDefined();
    expect(repos.quotaUsage).toBeDefined();
    expect(repos.idempotency).toBeDefined();
  });

  it('repositories built from different Store instances do not share state', async () => {
    const a = createRepositories(new MemoryStore());
    const b = createRepositories(new MemoryStore());

    await a.users.create({
      id: 'usr_a',
      display_name: 'A',
      email: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    });

    await expect(a.users.findById('usr_a')).resolves.not.toBeNull();
    await expect(b.users.findById('usr_a')).resolves.toBeNull();
  });
});

describe('getRepositories', () => {
  it('returns the same instance on every call — a globalThis-pinned singleton', () => {
    const first = getRepositories();
    const second = getRepositories();
    expect(first).toBe(second);
  });

  it('the singleton is backed by a real, working JsonStore', async () => {
    const repos = getRepositories();
    const row: UserRow = {
      id: 'usr_singleton_test',
      display_name: 'Singleton Test',
      email: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
    };
    await repos.users.create(row);
    await expect(repos.users.findById('usr_singleton_test')).resolves.toMatchObject({
      display_name: 'Singleton Test',
    });

    const onDisk = JSON.parse(
      await fs.readFile(`${INDEX_TEST_DATA_DIR}/users.json`, 'utf8'),
    ) as { rows: UserRow[] };
    expect(onDisk.rows.some((r) => r.id === 'usr_singleton_test')).toBe(true);
  });
});
