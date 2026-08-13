/**
 * Side-effecting test helper — NOT a test file itself (does not match the `*.{test,spec}.ts`
 * glob in `vitest.config.ts`, so it is never collected as a suite).
 *
 * `lib/server/env.ts` parses `process.env` through a zod schema at module load and throws
 * immediately if `AUTH_SECRET` is missing (architecture.md §9). Any test that transitively
 * imports `lib/server/db/jsonStore.ts` (directly, or via `index.ts`/`seed.ts`, both of which
 * import it for the CLI/singleton path) therefore needs `AUTH_SECRET` set *before* that import
 * is evaluated.
 *
 * ES module semantics guarantee sibling `import` statements in one file evaluate in source
 * order, each exactly once — so a test file that writes:
 *
 * ```ts
 * import '../testEnvSetup';
 * import { JsonStore } from '../../../../lib/server/db/jsonStore';
 * ```
 *
 * is guaranteed this module runs first, regardless of where a plain `process.env.AUTH_SECRET =
 * …` assignment would sit textually in the same file (plain statements never run before any of
 * that file's own `import`s, no matter their source position — only a separate module import
 * does). This file must always be the first import in such a test file.
 */
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = 'test-secret-for-db-layer-tests-only';
}

export {};
