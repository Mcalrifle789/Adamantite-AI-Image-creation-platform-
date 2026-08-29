import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('account store selection', () => {
  it('refuses the local JSON fallback in production when DATABASE_URL is missing', async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'production' };
    delete process.env.DATABASE_URL;
    vi.resetModules();

    const { getAccountStore } = await import('@/lib/server/auth/accountStore');

    expect(() => getAccountStore()).toThrow(/DATABASE_URL is not set/);
  });

  it('keeps the JSON fallback for local development when DATABASE_URL is missing', async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development' };
    delete process.env.DATABASE_URL;
    vi.resetModules();

    const { getAccountStore } = await import('@/lib/server/auth/accountStore');

    expect(getAccountStore().kind).toBe('json');
  });
});
