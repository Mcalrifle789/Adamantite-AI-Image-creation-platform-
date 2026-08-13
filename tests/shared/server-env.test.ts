import { afterEach, describe, expect, it, vi } from 'vitest';

// lib/server/env.ts parses process.env at module load, so each scenario mutates process.env
// and re-imports the fresh module via vi.resetModules().
const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('lib/server/env', () => {
  it('throws when AUTH_SECRET is missing', async () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AUTH_SECRET;
    vi.resetModules();

    await expect(import('../../lib/server/env')).rejects.toThrow(/AUTH_SECRET/);
  });

  it('parses successfully and applies documented defaults when only AUTH_SECRET is set', async () => {
    process.env = { ...ORIGINAL_ENV, AUTH_SECRET: 'test-secret' };
    delete process.env.MOCK_LATENCY_SCALE;
    delete process.env.MOCK_FAILURE_RATE;
    delete process.env.ADAMANTITE_DATA_DIR;
    delete process.env.ADAMANTITE_PROVIDER_API_KEY;
    vi.resetModules();

    const { env } = await import('../../lib/server/env');
    expect(env.AUTH_SECRET).toBe('test-secret');
    expect(env.MOCK_LATENCY_SCALE).toBe(1);
    expect(env.MOCK_FAILURE_RATE).toBe(0);
    expect(env.ADAMANTITE_DATA_DIR).toBeUndefined();
    expect(env.ADAMANTITE_PROVIDER_API_KEY).toBeUndefined();
  });

  it('coerces numeric override env vars', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      AUTH_SECRET: 'test-secret',
      MOCK_LATENCY_SCALE: '0',
      MOCK_FAILURE_RATE: '0.25',
    };
    vi.resetModules();

    const { env } = await import('../../lib/server/env');
    expect(env.MOCK_LATENCY_SCALE).toBe(0);
    expect(env.MOCK_FAILURE_RATE).toBe(0.25);
  });

  it('rejects a MOCK_FAILURE_RATE outside 0..1', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      AUTH_SECRET: 'test-secret',
      MOCK_FAILURE_RATE: '1.5',
    };
    vi.resetModules();

    await expect(import('../../lib/server/env')).rejects.toThrow();
  });
});
