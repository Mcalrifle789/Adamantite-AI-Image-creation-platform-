/**
 * Barrel for the shared layer. `lib/shared/**` is a leaf module — it must never import from
 * `lib/server`, `lib/client`, `components`, or `app` (design adjudication D-01, enforced by
 * `tests/shared/dependency-direction.test.ts`).
 */

export * from './api-types';
export * from './constants';
export * from './format';
export * from './ids';
export * from './schemas';
