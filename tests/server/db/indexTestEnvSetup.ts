/**
 * Side-effecting test helper for `index.test.ts` only — see `testEnvSetup.ts` for the general
 * explanation of why this has to be a separate sibling module rather than inline code.
 *
 * `getRepositories()` constructs a bare `new JsonStore()`, which resolves its data directory
 * from `ADAMANTITE_DATA_DIR` (falling back to `.data` at the process cwd). Without pointing that
 * at a throwaway temp directory *before* `lib/server/db/jsonStore.ts` (and therefore
 * `lib/server/env.ts`) is first imported, a test that calls `getRepositories()` would read and
 * write the real project's `.data/` directory — this file exists to prevent that.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'test-secret-for-db-layer-tests-only';
}

export const INDEX_TEST_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'adamantite-index-test-'));
process.env.ADAMANTITE_DATA_DIR = INDEX_TEST_DATA_DIR;

export {};
