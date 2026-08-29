import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };
let dataDir: string;

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(tmpdir(), 'ada-account-service-'));
  process.env = {
    ...ORIGINAL_ENV,
    ADAMANTITE_DATA_DIR: dataDir,
    AUTH_SECRET: 'test-secret-for-account-service',
    NODE_ENV: 'development',
  };
  delete process.env.DATABASE_URL;
  vi.resetModules();
});

afterEach(async () => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
  await fs.rm(dataDir, { recursive: true, force: true });
});

describe('account service ownership', () => {
  it('makes mgeorgepalasch@gmail.com the owner account', async () => {
    const accounts = await import('@/lib/server/auth/accounts');

    const owner = await accounts.registerAccount({
      displayName: 'Michael George Palasch',
      email: 'mgeorgepalasch@gmail.com',
      password: 'correct horse battery staple',
    });
    const user = await accounts.registerAccount({
      displayName: 'Studio User',
      email: 'studio@example.com',
      password: 'correct horse battery staple',
    });

    expect(owner.role).toBe('owner');
    expect(user.role).toBe('user');
    expect(accounts.toAccountSession(owner).account.role).toBe('owner');
  });

  it('returns owner-only account analytics', async () => {
    const accounts = await import('@/lib/server/auth/accounts');

    const owner = await accounts.registerAccount({
      displayName: 'Michael George Palasch',
      email: 'mgeorgepalasch@gmail.com',
      password: 'correct horse battery staple',
    });
    await accounts.registerAccount({
      displayName: 'Studio User',
      email: 'studio@example.com',
      password: 'correct horse battery staple',
    });
    await accounts.authenticate('studio@example.com', 'correct horse battery staple');

    const analytics = await accounts.getOwnerAnalytics(owner);

    expect(analytics.ownerEmail).toBe('mgeorgepalasch@gmail.com');
    expect(analytics.ownerPresent).toBe(true);
    expect(analytics.totalAccounts).toBe(2);
    expect(analytics.recentAccounts).toHaveLength(2);
    expect(analytics.recentSignIns[0]?.email).toBe('studio@example.com');
  });
});
