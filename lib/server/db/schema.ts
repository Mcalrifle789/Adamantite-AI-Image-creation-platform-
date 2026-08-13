import 'server-only';

import type {
  ChatMessageRole,
  ChatMessageStatus,
  GenerationMode,
  GenerationStatus,
  LedgerEntryKind,
  MediaKind,
  ModelTier,
  PlanId,
  ProjectStatus,
} from '../../shared/api-types';

/**
 * Row shapes for every JSON-file table, mirrored field-for-field from
 * `.agents/design/data-model.md` §3's DDL — column names stay `snake_case` exactly as written
 * there (not the wire DTO's `camelCase`) so the migration to `schema.prisma` (§1.1) is
 * mechanical: paste the DDL, translate 1:1, no renaming pass. Repositories are the seam that
 * translates between this shape and the `lib/shared/api-types.ts` DTOs the API returns.
 *
 * Two deliberate departures from literal SQL typing, because this is a JSON store, not SQL:
 * - `messages.attachment_asset_ids` is `string[]` here rather than a `TEXT` column holding a
 *   JSON-encoded string — there is no serialisation boundary to cross inside a JSON file.
 * - `quota_usage.counts` is `Record<string, number>` for the same reason.
 * Both still round-trip losslessly through a real `TEXT`/`jsonb` column at migration time.
 */

/** The nine tables, named exactly as in data-model.md §3 (not the on-disk file names — see
 * `TABLE_FILE_NAMES` in `store.ts` for the `credit_ledger` → `ledger.json` mapping from §1). */
export const TABLE_NAMES = [
  'users',
  'subscriptions',
  'projects',
  'generations',
  'assets',
  'messages',
  'credit_ledger',
  'quota_usage',
  'idempotency',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

/** §3.1 `users` */
export interface UserRow {
  id: string;
  display_name: string;
  /** UNIQUE(email) WHERE email IS NOT NULL. Null for the M1 demo user. */
  email: string | null;
  created_at: string;
  updated_at: string;
}

/** §3.2 `subscriptions` — UNIQUE(user_id): exactly one subscription per user in M1. */
export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: PlanId;
  /** `active` only in M1. */
  status: 'active';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

/** §3.3 `projects` — CHECK ((status='trashed') = (trashed_at IS NOT NULL)). */
export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  default_model_id: string | null;
  initial_prompt: string | null;
  cover_asset_id: string | null;
  duplicated_from_id: string | null;
  created_at: string;
  updated_at: string;
  trashed_at: string | null;
}

/**
 * §3.4 `generations`.
 * CHECK ((mode='edit') = (source_asset_id IS NOT NULL)).
 * CHECK ((status IN ('succeeded','failed','cancelled')) = (completed_at IS NOT NULL)).
 */
export interface GenerationRow {
  id: string;
  /** Denormalised for the quota query — never join to get it. */
  user_id: string;
  project_id: string;
  model_id: string;
  model_display_name: string;
  model_tier: ModelTier;
  kind: MediaKind;
  mode: GenerationMode;
  prompt: string;
  aspect_ratio: string;
  /** Always materialised, never null. */
  seed: number;
  duration_seconds: number | null;
  /** Non-null iff mode='edit'. */
  source_asset_id: string | null;
  status: GenerationStatus;
  progress: number;
  price_credits: number;
  estimated_seconds: number;
  provider_id: string;
  provider_job_id: string | null;
  timeline_seed: number;
  error_code: string | null;
  error_message: string | null;
  error_retriable: boolean | null;
  retry_of_id: string | null;
  result_message_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/** §3.5 `assets` — bytes are immutable once written; duplication shares `storage_key`. */
export interface AssetRow {
  id: string;
  /** Denormalised for the ownership check on every content read. */
  user_id: string;
  project_id: string;
  generation_id: string;
  kind: MediaKind;
  mime_type: string;
  width: number;
  height: number;
  duration_seconds: number | null;
  byte_size: number;
  /** `assets/<id>.svg` — the only column that changes when object storage lands. */
  storage_key: string;
  checksum_sha256: string;
  created_at: string;
}

/** §3.6 `messages` — CHECK (role='assistant' OR status='complete'): user messages are never pending. */
export interface MessageRow {
  id: string;
  user_id: string;
  project_id: string;
  role: ChatMessageRole;
  /** May be `''` while pending; ≤4000 (data-model.md §3.6; the wire DTO caps input at 2000). */
  content: string;
  status: ChatMessageStatus;
  generation_id: string | null;
  /** 0..1 entries in M1. JSON array in SQL terms; native array here (see file header). */
  attachment_asset_ids: string[];
  created_at: string;
  updated_at: string;
}

/**
 * §3.7 `credit_ledger` — append-only. No repository exposes update or delete for this table.
 * UNIQUE(user_id, generation_id, kind) is the double-charge guard, with SQL NULL semantics: a
 * NULL `generation_id` (e.g. `grant`/`expire` entries) never collides with another NULL — only
 * non-null `generation_id` values participate in the uniqueness check. See `ledgerRepository.ts`.
 */
export interface LedgerRow {
  id: string;
  user_id: string;
  /** The billing period this entry belongs to. */
  period_start: string;
  kind: LedgerEntryKind;
  /** Signed: grants/refunds > 0, debits/expiry < 0. */
  delta_credits: number;
  /** Running balance, written at append time. */
  balance_after: number;
  reason: string;
  generation_id: string | null;
  /** Mirrors the request's Idempotency-Key so a replay cannot double-charge. */
  idempotency_key: string | null;
  created_at: string;
}

/**
 * §3.8 `quota_usage` — denormalised, rebuildable cache. PK (user_id, period_start). Authoritative
 * for nothing: if it ever disagrees with a ledger sum, the sum wins and this row is rewritten.
 */
export interface QuotaUsageRow {
  user_id: string;
  period_start: string;
  period_end: string;
  plan_id: PlanId;
  granted_credits: number;
  used_credits: number;
  reserved_credits: number;
  balance_credits: number;
  /** e.g. `{"image:premium": 12, "video:mid": 3}` — succeeded counts. */
  counts: Record<string, number>;
  updated_at: string;
}

/** §3.9 `idempotency` — PK (user_id, key). Retention: 24h, swept opportunistically on write. */
export interface IdempotencyRow {
  user_id: string;
  key: string;
  route: string;
  request_hash: string;
  status_code: number;
  /** Replayed verbatim — stored as the raw JSON text, not re-parsed. */
  response_json: string;
  created_at: string;
}

/** Maps a `TableName` to its row shape — used by generic store/repository plumbing. */
export interface TableRowMap {
  users: UserRow;
  subscriptions: SubscriptionRow;
  projects: ProjectRow;
  generations: GenerationRow;
  assets: AssetRow;
  messages: MessageRow;
  credit_ledger: LedgerRow;
  quota_usage: QuotaUsageRow;
  idempotency: IdempotencyRow;
}
