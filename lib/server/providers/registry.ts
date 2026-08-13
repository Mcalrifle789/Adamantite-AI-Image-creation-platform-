import 'server-only';

import type { MediaKind, ModelSummary, ModelTier } from '../../shared/api-types';
import { MODEL_TIERS } from '../../shared/constants';
import { MODELS } from '../../../config/models';
import { systemClock } from '../clock';
import { createMockProvider } from './mock/mockProvider';
import type { ModelCatalogueEntry, ModelProvider } from './types';

/**
 * Model id -> provider resolution and the DTO mapper — architecture.md §3.1 / §5.
 *
 * `providers/registry` never imports from `credits/`, `services/`, `db/`, `app/`, or
 * `components/` (architecture.md §3, §5): it takes a model id and gives back a descriptor or a
 * provider, nothing more. `lib/shared/**` is the one exception — every module may depend on it.
 */

const TIER_LABELS: Record<ModelTier, string> = {
  budget: 'Budget',
  mid: 'Mid',
  premium: 'Premium',
  high_end: 'High-End',
};

const TIER_RANK: Record<ModelTier, number> = Object.fromEntries(
  MODEL_TIERS.map((tier, index) => [tier, index]),
) as Record<ModelTier, number>;

/** The one production provider instance for M1 — the mock is the only adapter. A real adapter
 * registers here alongside it (`{ mock: mockProvider, kling: klingProvider, … }`) without
 * touching any caller of {@link getProviderForModel}. */
const PROVIDERS: Record<string, ModelProvider> = {
  mock: createMockProvider({ clock: systemClock }),
};

const MODEL_INDEX: ReadonlyMap<string, ModelCatalogueEntry> = new Map(
  MODELS.map((model) => [model.id, model]),
);

/** Looks up a catalogue entry by its public id. `undefined` — not a throw — so a caller can turn
 * an unknown id into a `422 MODEL_UNAVAILABLE` instead of a 500. */
export function getModelDescriptor(modelId: string): ModelCatalogueEntry | undefined {
  return MODEL_INDEX.get(modelId);
}

/** Resolves a model id to the `ModelProvider` that serves it. `undefined` when the model id is
 * unknown or (in a future milestone) its provider id has no registered adapter. */
export function getProviderForModel(modelId: string): ModelProvider | undefined {
  const model = getModelDescriptor(modelId);
  if (!model) return undefined;
  return PROVIDERS[model.providerId];
}

export interface ListModelsFilter {
  kind?: MediaKind;
  tier?: ModelTier;
  featured?: boolean;
  available?: boolean;
}

/** `GET /api/models` query filters, ANDed together — api-contract.md §3.5. Ordering: featured
 * first, then tier ascending (`budget` < `mid` < `premium` < `high_end`), then `displayName`. */
export function listModels(filter: ListModelsFilter = {}): ModelCatalogueEntry[] {
  return MODELS.filter((model) => {
    if (filter.kind !== undefined && model.kind !== filter.kind) return false;
    if (filter.tier !== undefined && model.tier !== filter.tier) return false;
    if (filter.featured !== undefined && model.featured !== filter.featured) return false;
    if (filter.available !== undefined && model.available !== filter.available) return false;
    return true;
  }).sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const tierDelta = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    if (tierDelta !== 0) return tierDelta;
    return a.displayName.localeCompare(b.displayName);
  });
}

export interface ToModelSummaryContext {
  balanceCredits: number;
}

/**
 * Maps a server-only catalogue entry to the public `ModelSummary` DTO — api-contract.md §2.
 * `upstreamModel`, `providerId`, and `previewAssetPath` (renamed `previewUrl`, still just a
 * static bundled path — never an upstream endpoint) never appear on the result. `affordable` and
 * `remainingAtBalance` are added only when `ctx` is supplied, and are genuinely absent (not
 * `undefined`-valued keys) otherwise, matching the DTO's `?` optionality.
 */
export function toModelSummary(
  descriptor: ModelCatalogueEntry,
  ctx?: ToModelSummaryContext,
): ModelSummary {
  const base: ModelSummary = {
    id: descriptor.id,
    displayName: descriptor.displayName,
    kind: descriptor.kind,
    tier: descriptor.tier,
    tierLabel: TIER_LABELS[descriptor.tier],
    badges: descriptor.badges,
    priceCredits: descriptor.priceCredits,
    estimatedSeconds: descriptor.estimatedSeconds,
    aspectRatios: descriptor.aspectRatios,
    maxDurationSeconds: descriptor.maxDurationSeconds ?? null,
    previewUrl: descriptor.previewAssetPath,
    featured: descriptor.featured,
    available: descriptor.available,
  };

  if (ctx === undefined) return base;

  return {
    ...base,
    affordable: descriptor.priceCredits <= ctx.balanceCredits,
    remainingAtBalance: Math.floor(ctx.balanceCredits / descriptor.priceCredits),
  };
}
