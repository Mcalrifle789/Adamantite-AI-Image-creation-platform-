/**
 * Shared, side-effect-free constants used on both the server and the client.
 * See `.agents/design/data-model.md` §6 and `.agents/design/api-contract.md` §1-§2 for the
 * source of truth these mirror.
 */

/** `1 credit = US$0.0001`. All credit values are integers everywhere in this system. */
export const CREDIT_MICRO_USD = 0.0001;

/** `project.name` — data-model.md §6: trim, 1..80, strip control chars. */
export const PROJECT_NAME_MAX_LENGTH = 80;

/** `prompt` / `message.content` — data-model.md §6: trim, 1..2000, strip control chars except `\n`. */
export const PROMPT_MAX_LENGTH = 2000;

/** `seed` — data-model.md §6: integer 0..2^31-1. */
export const SEED_MIN = 0;
export const SEED_MAX = 2_147_483_647;

/** `durationSeconds` — data-model.md §6: integer, 1..model.maxDurationSeconds (5 in M1). */
export const DURATION_SECONDS_MIN = 1;
export const M1_MAX_DURATION_SECONDS = 5;

/** `limit` — data-model.md §6: integer 1..100, default 30. */
export const MIN_PAGE_LIMIT = 1;
export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_PAGE_LIMIT = 30;

/** `cursor` — data-model.md §6: opaque string ≤128 chars. */
export const CURSOR_MAX_LENGTH = 128;

/** `Idempotency-Key` — data-model.md §6: uuid v4 shape, ≤64 chars. */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 64;

/** `GET /api/assets/{id}/content` alt text — ux-patterns.md §9: prompt truncated to 160 chars. */
export const ASSET_ALT_MAX_LENGTH = 160;

/** `GET /api/assets/{id}/content?download=1` filename slug — api-contract.md §7.2: first 40 chars. */
export const PROMPT_SLUG_MAX_LENGTH = 40;

/** `PROJECT_LIMIT_REACHED` — data-model.md §3.3: 200 active + trashed projects per user. */
export const MAX_PROJECTS_PER_USER = 200;

export const MEDIA_KINDS = ['image', 'video'] as const;
export const MODEL_TIERS = ['budget', 'mid', 'premium', 'high_end'] as const;
export const PLAN_IDS = ['port', 'standard', 'pro', 'max'] as const;
export const GENERATION_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const;
export const GENERATION_MODES = ['create', 'edit'] as const;
export const PROJECT_STATUSES = ['active', 'trashed'] as const;
export const CHAT_MESSAGE_ROLES = ['user', 'assistant'] as const;
export const CHAT_MESSAGE_STATUSES = ['complete', 'pending', 'failed'] as const;
export const MODEL_BADGES = ['latest', 'new', 'fast'] as const;
export const PLAN_ACCENTS = ['blue', 'cyan', 'purple', 'magenta'] as const;
export const LEDGER_ENTRY_KINDS = [
  'grant',
  'debit_reserve',
  'refund',
  'settle_adjustment',
  'expire',
] as const;
