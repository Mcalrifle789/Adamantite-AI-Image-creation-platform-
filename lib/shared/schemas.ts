/**
 * Zod schemas for every validation rule in `.agents/design/data-model.md` §6, plus the request
 * bodies and query shapes documented in `.agents/design/api-contract.md`. Defined once here and
 * imported by both the route handler (authoritative) and the client form (fast feedback) — the
 * server never trusts the client's copy.
 */

import { z } from 'zod';
import {
  CURSOR_MAX_LENGTH,
  DEFAULT_PAGE_LIMIT,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  MAX_PAGE_LIMIT,
  M1_MAX_DURATION_SECONDS,
  MIN_PAGE_LIMIT,
  PROJECT_NAME_MAX_LENGTH,
  PROMPT_MAX_LENGTH,
  SEED_MAX,
  SEED_MIN,
} from './constants';

// ---------------------------------------------------------------------------
// Enum schemas — mirror the union types in api-types.ts
// ---------------------------------------------------------------------------

export const mediaKindSchema = z.enum(['image', 'video']);
export const modelTierSchema = z.enum(['budget', 'mid', 'premium', 'high_end']);
export const planIdSchema = z.enum(['port', 'standard', 'pro', 'max']);
export const generationStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);
export const generationModeSchema = z.enum(['create', 'edit']);
export const projectStatusSchema = z.enum(['active', 'trashed']);

// ---------------------------------------------------------------------------
// Field-level schemas — data-model.md §6
// ---------------------------------------------------------------------------

/** Removes ASCII/C1 control characters, optionally keeping a short allow-list (e.g. `\n`). */
function stripControlChars(value: string, keep: readonly string[] = []): string {
  const keepSet = new Set(keep);
  return Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      const isControl = code <= 0x1f || code === 0x7f;
      return !isControl || keepSet.has(char);
    })
    .join('');
}

/** `project.name` — trim, 1..80, strip control chars, reject if empty after trim. */
export const projectNameSchema = z
  .string()
  .transform((value) => stripControlChars(value.trim()))
  .pipe(
    z
      .string()
      .min(1, 'Name is required')
      .max(PROJECT_NAME_MAX_LENGTH, `Name must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer`),
  );

/** `prompt` / `message.content` — trim, 1..2000, strip control chars except `\n`. */
export const promptSchema = z
  .string()
  .transform((value) => stripControlChars(value.trim(), ['\n']))
  .pipe(
    z
      .string()
      .min(1, 'Prompt is required')
      .max(PROMPT_MAX_LENGTH, `Prompt must be ${PROMPT_MAX_LENGTH} characters or fewer`),
  );

/** Same rule as `promptSchema` — data-model.md §6 documents `prompt` and `message.content` together. */
export const messageContentSchema = promptSchema;

/** `aspectRatio` — shape-checked here; membership in the resolved model's `aspectRatios` is a
 * server-side lookup against the catalogue (out of scope for the shared layer). */
export const aspectRatioSchema = z
  .string()
  .regex(/^\d{1,2}:\d{1,2}$/, 'aspectRatio must look like "16:9"');

/** `seed` — integer 0..2^31-1. */
export const seedSchema = z.number().int().min(SEED_MIN).max(SEED_MAX);

/** `durationSeconds` — integer, 1..model.maxDurationSeconds (5 in M1). The per-model ceiling is
 * re-checked server-side against the resolved model; this enforces M1's actual ceiling. */
export const durationSecondsSchema = z.number().int().min(1).max(M1_MAX_DURATION_SECONDS);

/** `limit` — integer 1..100, default 30. Coerces so it can validate a raw query-string value. */
export const limitSchema = z.coerce
  .number()
  .int()
  .min(MIN_PAGE_LIMIT)
  .max(MAX_PAGE_LIMIT)
  .default(DEFAULT_PAGE_LIMIT);

/** `cursor` — opaque string ≤128 chars. An unparseable cursor is a `400`, never a silent reset —
 * enforced here only as a shape check; opacity means this layer never decodes it. */
export const cursorSchema = z.string().max(CURSOR_MAX_LENGTH).optional();

// `planId` — enum. See `planIdSchema` above (data-model.md §6 lists it as its own validation
// rule; it is the same schema used throughout the enum section).

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** `Idempotency-Key` header — uuid v4 shape, ≤64 chars. */
export const idempotencyKeySchema = z
  .string()
  .max(IDEMPOTENCY_KEY_MAX_LENGTH)
  .regex(UUID_V4_PATTERN, 'Idempotency-Key must be a UUID v4');

/** Coerces the `"true"` / `"false"` query-string values a URLSearchParams entry actually carries.
 * Deliberately not `z.coerce.boolean()` — `Boolean("false")` is `true`, which would silently
 * invert every `?featured=false` / `?available=false` filter. */
export const booleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

// ---------------------------------------------------------------------------
// Shared query schemas — cursor, limit, status filters (api-contract.md §1, §3-§8)
// ---------------------------------------------------------------------------

export const paginationQuerySchema = z.object({
  cursor: cursorSchema,
  limit: limitSchema,
});

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: projectStatusSchema.default('active'),
});

export const listGenerationsQuerySchema = paginationQuerySchema.extend({
  projectId: z.string().min(1).optional(),
  status: z.union([generationStatusSchema, z.array(generationStatusSchema)]).optional(),
  kind: mediaKindSchema.optional(),
});

export const listModelsQuerySchema = z.object({
  kind: mediaKindSchema.optional(),
  tier: modelTierSchema.optional(),
  featured: booleanQuerySchema.optional(),
  available: booleanQuerySchema.optional(),
});

export const listMessagesQuerySchema = paginationQuerySchema;

export const listLedgerQuerySchema = paginationQuerySchema.extend({
  periodStart: z.string().datetime().optional(),
});

// ---------------------------------------------------------------------------
// Request bodies — api-contract.md §3-§8
// ---------------------------------------------------------------------------

/** `POST /api/session` — dev-only demo-user creation. */
export const createSessionSchema = z.object({
  planId: planIdSchema.optional(),
});

/** `POST /api/generations` §4.1 body — the `params` sub-object. */
export const generationParamsInputSchema = z.object({
  aspectRatio: aspectRatioSchema.optional(),
  seed: seedSchema.optional(),
  durationSeconds: durationSecondsSchema.optional(),
  sourceAssetId: z.string().min(1).optional(),
});

/** `POST /api/generations` §4.1 body. */
export const createGenerationSchema = z.object({
  projectId: z.string().min(1),
  modelId: z.string().min(1),
  prompt: promptSchema,
  kind: mediaKindSchema,
  mode: generationModeSchema.default('create'),
  params: generationParamsInputSchema.optional(),
});

/** `POST /api/projects` §5.2 body. */
export const createProjectSchema = z.object({
  name: projectNameSchema.optional(),
  defaultModelId: z.string().min(1).optional(),
  initialPrompt: promptSchema.optional(),
});

/** `PATCH /api/projects/{id}` §5.4 body — at least one key required. */
export const updateProjectSchema = z
  .object({
    name: projectNameSchema.optional(),
    defaultModelId: z.string().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

/** `POST /api/projects/{id}/duplicate` §5.8 body. */
export const duplicateProjectSchema = z.object({
  name: projectNameSchema.optional(),
});

/** `POST /api/projects/{id}/messages` §6.2 body — attachments capped at one in M1. */
export const createMessageSchema = z.object({
  content: messageContentSchema,
  attachmentAssetIds: z.array(z.string().min(1)).max(1).optional(),
  modelId: z.string().min(1).optional(),
});

/** `POST /api/credits/estimate` §8.3 body. */
export const estimateCreditsSchema = z.object({
  modelId: z.string().min(1),
  kind: mediaKindSchema,
  params: z
    .object({
      durationSeconds: durationSecondsSchema.optional(),
    })
    .optional(),
});

/** `POST /api/subscription` §8.4 body. */
export const changeSubscriptionSchema = z.object({
  planId: planIdSchema,
});
