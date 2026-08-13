import { beforeAll, describe, expect, it } from 'vitest';

import { MODELS } from '../../../config/models';

// lib/server/providers/registry.ts imports lib/server/providers/mock/mockProvider.ts, which in
// turn imports lib/server/env.ts — which throws at module load if AUTH_SECRET is unset
// (architecture.md §9). Same rationale and pattern as tests/server/providers/mockProvider.test.ts:
// a dynamic import in beforeAll, after ensuring the var is set, rather than a static top-level
// import (which is hoisted ahead of any code in this file, including a `process.env` write).
let getModelDescriptor: typeof import('../../../lib/server/providers/registry').getModelDescriptor;
let getProviderForModel: typeof import('../../../lib/server/providers/registry').getProviderForModel;
let listModels: typeof import('../../../lib/server/providers/registry').listModels;
let toModelSummary: typeof import('../../../lib/server/providers/registry').toModelSummary;

beforeAll(async () => {
  process.env.AUTH_SECRET ??= 'test-secret-for-provider-tests';
  ({ getModelDescriptor, getProviderForModel, listModels, toModelSummary } = await import(
    '../../../lib/server/providers/registry'
  ));
});

// The exact key set of `ModelSummary` (lib/shared/api-types.ts) when no session context is
// supplied — `affordable` and `remainingAtBalance` are only present with a session (api-contract
// §2, marked `?`).
const MODEL_SUMMARY_BASE_KEYS = [
  'id',
  'displayName',
  'kind',
  'tier',
  'tierLabel',
  'badges',
  'priceCredits',
  'estimatedSeconds',
  'aspectRatios',
  'maxDurationSeconds',
  'previewUrl',
  'featured',
  'available',
].sort();

describe('getModelDescriptor', () => {
  it('resolves a known id to its catalogue entry', () => {
    const descriptor = getModelDescriptor('nano-banana-2');
    expect(descriptor?.displayName).toBe('Nano Banana 2');
  });

  it('returns undefined — not a throw — for an unknown id', () => {
    expect(getModelDescriptor('does-not-exist')).toBeUndefined();
  });
});

describe('getProviderForModel', () => {
  it('resolves every catalogue model to the mock provider in M1', () => {
    for (const model of MODELS) {
      const provider = getProviderForModel(model.id);
      expect(provider?.id).toBe('mock');
    }
  });

  it('returns undefined for an unknown model id', () => {
    expect(getProviderForModel('does-not-exist')).toBeUndefined();
  });
});

describe('listModels — filtering', () => {
  it('with no filter, returns all 12 catalogue models', () => {
    expect(listModels()).toHaveLength(12);
  });

  it('filters by kind', () => {
    const images = listModels({ kind: 'image' });
    expect(images.length).toBeGreaterThan(0);
    expect(images.every((m) => m.kind === 'image')).toBe(true);

    const videos = listModels({ kind: 'video' });
    expect(videos.every((m) => m.kind === 'video')).toBe(true);
    expect(images.length + videos.length).toBe(12);
  });

  it('filters by tier', () => {
    const budget = listModels({ tier: 'budget' });
    expect(budget.every((m) => m.tier === 'budget')).toBe(true);
    expect(budget.length).toBe(3); // flux-schnell, sdxl-turbo, hailuo-02
  });

  it('filters by featured', () => {
    const featured = listModels({ featured: true });
    expect(featured).toHaveLength(4);
    expect(featured.every((m) => m.featured)).toBe(true);
  });

  it('filters by available', () => {
    expect(listModels({ available: true })).toHaveLength(12);
    expect(listModels({ available: false })).toHaveLength(0);
  });

  it('ANDs multiple filters together', () => {
    const result = listModels({ kind: 'video', tier: 'mid' });
    expect(result.map((m) => m.id).sort()).toEqual(['seedance-2-5', 'wan-2-5']);
  });

  it('returns an empty array when no model matches the combined filter', () => {
    expect(listModels({ kind: 'video', tier: 'budget', featured: true })).toEqual([]);
  });
});

describe('listModels — ordering', () => {
  it('orders featured first, then tier ascending, then displayName', () => {
    const ordered = listModels();
    const orderedIds = ordered.map((m) => m.id);

    // Featured group first: nano-banana-2 (premium), gpt-image-2 (premium), seedance-2-5 (mid),
    // kling-2-5 (premium) — sorted within the featured group by tier then name.
    const featuredIds = orderedIds.slice(0, 4);
    expect(new Set(featuredIds)).toEqual(
      new Set(['nano-banana-2', 'gpt-image-2', 'kling-2-5', 'seedance-2-5']),
    );
    // Within featured: mid (seedance-2-5) before premium (gpt-image-2, kling-2-5, nano-banana-2).
    expect(featuredIds[0]).toBe('seedance-2-5');
    // The two premium+featured models are alphabetical by displayName: "GPT-Image 2" < "Kling 2.5" < "Nano Banana 2".
    expect(featuredIds.slice(1)).toEqual(['gpt-image-2', 'kling-2-5', 'nano-banana-2']);

    // Every featured model precedes every non-featured model.
    const firstNonFeaturedIndex = orderedIds.findIndex((id) => !featuredIds.includes(id));
    expect(firstNonFeaturedIndex).toBe(4);

    // Tiers are non-decreasing in rank (budget < mid < premium < high_end) within each
    // featured/non-featured group.
    const tierRank: Record<string, number> = { budget: 0, mid: 1, premium: 2, high_end: 3 };
    const nonFeatured = ordered.slice(4);
    let previousRank = -1;
    for (const model of nonFeatured) {
      const rank = tierRank[model.tier]!;
      expect(rank).toBeGreaterThanOrEqual(previousRank);
      previousRank = rank;
    }
  });
});

describe('toModelSummary', () => {
  // `getModelDescriptor` is only assigned inside the module-level `beforeAll` above (it depends
  // on the dynamic import), which has not run yet while `describe` bodies are being collected —
  // so this must be a getter looked up lazily inside each `it`, not a value captured at collection time.
  const descriptor = () => getModelDescriptor('seedance-2-5')!;

  it('produces exactly the ModelSummary base keys when no context is given', () => {
    const summary = toModelSummary(descriptor());
    expect(Object.keys(summary).sort()).toEqual(MODEL_SUMMARY_BASE_KEYS);
  });

  it('never leaks upstreamModel, providerId, or the raw previewAssetPath key', () => {
    const summary = toModelSummary(descriptor());
    const keys = Object.keys(summary);
    expect(keys).not.toContain('upstreamModel');
    expect(keys).not.toContain('providerId');
    expect(keys).not.toContain('previewAssetPath');
    expect(JSON.stringify(summary)).not.toContain(descriptor().upstreamModel);
  });

  it('maps fields correctly', () => {
    const summary = toModelSummary(descriptor());
    expect(summary.id).toBe('seedance-2-5');
    expect(summary.displayName).toBe('Seedance 2.5');
    expect(summary.kind).toBe('video');
    expect(summary.tier).toBe('mid');
    expect(summary.tierLabel).toBe('Mid');
    expect(summary.priceCredits).toBe(5000);
    expect(summary.estimatedSeconds).toBe(12);
    expect(summary.maxDurationSeconds).toBe(5);
    expect(summary.previewUrl).toBe('/brand/models/seedance-2-5.svg');
    expect(summary.featured).toBe(true);
    expect(summary.available).toBe(true);
  });

  it('maps an image model (no maxDurationSeconds) to null, not undefined', () => {
    const imageDescriptor = getModelDescriptor('nano-banana-2')!;
    const summary = toModelSummary(imageDescriptor);
    expect(summary.maxDurationSeconds).toBeNull();
  });

  it('adds affordable and remainingAtBalance only when ctx is supplied', () => {
    const withoutCtx = toModelSummary(descriptor());
    expect('affordable' in withoutCtx).toBe(false);
    expect('remainingAtBalance' in withoutCtx).toBe(false);

    const affordable = toModelSummary(descriptor(), { balanceCredits: 10_000 });
    expect(affordable.affordable).toBe(true);
    expect(affordable.remainingAtBalance).toBe(2); // floor(10000 / 5000)

    const unaffordable = toModelSummary(descriptor(), { balanceCredits: 100 });
    expect(unaffordable.affordable).toBe(false);
    expect(unaffordable.remainingAtBalance).toBe(0);
  });

  it('with ctx, the key set is exactly the base keys plus affordable and remainingAtBalance', () => {
    const summary = toModelSummary(descriptor(), { balanceCredits: 10_000 });
    expect(Object.keys(summary).sort()).toEqual(
      [...MODEL_SUMMARY_BASE_KEYS, 'affordable', 'remainingAtBalance'].sort(),
    );
  });
});
