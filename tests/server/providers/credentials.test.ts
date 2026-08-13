import { afterEach, describe, expect, it, vi } from 'vitest';

// lib/server/env.ts parses process.env at module load, so — same pattern as
// tests/shared/server-env.test.ts — each scenario mutates process.env and re-imports both env
// and credentials fresh via vi.resetModules().
const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('getProviderCredentials', () => {
  it('returns the MOCK sentinel and isMock:true when ADAMANTITE_PROVIDER_API_KEY is unset', async () => {
    process.env = { ...ORIGINAL_ENV, AUTH_SECRET: 'test-secret' };
    delete process.env.ADAMANTITE_PROVIDER_API_KEY;
    vi.resetModules();

    const { getProviderCredentials, MOCK_CREDENTIALS_SENTINEL } = await import(
      '../../../lib/server/providers/credentials'
    );

    const credentials = getProviderCredentials();
    expect(credentials.isMock).toBe(true);
    expect(credentials.apiKey).toBe(MOCK_CREDENTIALS_SENTINEL);
    expect(credentials.apiKey).toBe('MOCK');
  });

  it('returns the real key and isMock:false when ADAMANTITE_PROVIDER_API_KEY is set', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      AUTH_SECRET: 'test-secret',
      ADAMANTITE_PROVIDER_API_KEY: 'sk-real-upstream-key',
    };
    vi.resetModules();

    const { getProviderCredentials } = await import('../../../lib/server/providers/credentials');

    const credentials = getProviderCredentials();
    expect(credentials.isMock).toBe(false);
    expect(credentials.apiKey).toBe('sk-real-upstream-key');
  });

  it('reads the key only through lib/server/env, never process.env directly', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(
        new URL('../../../lib/server/providers/credentials.ts', import.meta.url),
        'utf8',
      ),
    );
    expect(source).not.toMatch(/process\.env/);
    expect(source).toMatch(/from ['"]\.\.\/env['"]/);
  });
});
