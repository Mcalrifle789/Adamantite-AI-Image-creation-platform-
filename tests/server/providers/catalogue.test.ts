import { describe, expect, it } from 'vitest';

import { MODELS } from '../../../config/models';
import type { ModelBadge, ModelTier } from '../../../lib/server/providers/types';

/**
 * The frozen 12-row table from api-contract.md §3.5, transcribed verbatim so this test fails the
 * moment `config/models.ts` drifts from the contract cell for cell.
 */
interface ExpectedRow {
  id: string;
  displayName: string;
  kind: 'image' | 'video';
  tier: ModelTier;
  priceCredits: number;
  estimatedSeconds: number;
  featured: boolean;
  badges: ModelBadge[];
}

const EXPECTED: ExpectedRow[] = [
  { id: 'nano-banana-2', displayName: 'Nano Banana 2', kind: 'image', tier: 'premium', priceCredits: 600, estimatedSeconds: 5, featured: true, badges: ['latest'] },
  { id: 'gpt-image-2', displayName: 'GPT-Image 2', kind: 'image', tier: 'premium', priceCredits: 600, estimatedSeconds: 6, featured: true, badges: [] },
  { id: 'kling-2-5', displayName: 'Kling 2.5', kind: 'video', tier: 'premium', priceCredits: 12000, estimatedSeconds: 14, featured: true, badges: ['latest'] },
  { id: 'seedance-2-5', displayName: 'Seedance 2.5', kind: 'video', tier: 'mid', priceCredits: 5000, estimatedSeconds: 12, featured: true, badges: ['latest'] },
  { id: 'grok-image-1', displayName: 'Grok Image', kind: 'image', tier: 'mid', priceCredits: 250, estimatedSeconds: 4, featured: false, badges: [] },
  { id: 'flux-schnell', displayName: 'Flux Schnell', kind: 'image', tier: 'budget', priceCredits: 30, estimatedSeconds: 2, featured: false, badges: ['fast'] },
  { id: 'sdxl-turbo', displayName: 'SDXL Turbo', kind: 'image', tier: 'budget', priceCredits: 30, estimatedSeconds: 2, featured: false, badges: ['fast'] },
  { id: 'imagen-4-ultra', displayName: 'Imagen 4 Ultra', kind: 'image', tier: 'high_end', priceCredits: 1200, estimatedSeconds: 9, featured: false, badges: [] },
  { id: 'midjourney-7', displayName: 'Midjourney 7', kind: 'image', tier: 'high_end', priceCredits: 1200, estimatedSeconds: 10, featured: false, badges: [] },
  { id: 'hailuo-02', displayName: 'Hailuo 02', kind: 'video', tier: 'budget', priceCredits: 2500, estimatedSeconds: 10, featured: false, badges: ['fast'] },
  { id: 'wan-2-5', displayName: 'Wan 2.5', kind: 'video', tier: 'mid', priceCredits: 5000, estimatedSeconds: 12, featured: false, badges: [] },
  { id: 'veo-3-1', displayName: 'Veo 3.1', kind: 'video', tier: 'high_end', priceCredits: 24000, estimatedSeconds: 18, featured: false, badges: [] },
];

describe('config/models.ts — the M1 catalogue', () => {
  it('contains exactly 12 models', () => {
    expect(MODELS).toHaveLength(12);
  });

  it('has no duplicate ids', () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('matches api-contract.md §3.5 cell for cell', () => {
    for (const expected of EXPECTED) {
      const actual = MODELS.find((m) => m.id === expected.id);
      expect(actual, `missing model "${expected.id}"`).toBeDefined();
      expect(actual!.displayName).toBe(expected.displayName);
      expect(actual!.kind).toBe(expected.kind);
      expect(actual!.tier).toBe(expected.tier);
      expect(actual!.priceCredits).toBe(expected.priceCredits);
      expect(actual!.estimatedSeconds).toBe(expected.estimatedSeconds);
      expect(actual!.featured).toBe(expected.featured);
      expect(actual!.badges).toEqual(expected.badges);
    }
  });

  it('carries exactly the ids in EXPECTED — no extras, none missing', () => {
    expect(MODELS.map((m) => m.id).sort()).toEqual(EXPECTED.map((e) => e.id).sort());
  });

  it('sets maxDurationSeconds to 5 for every video model and undefined for every image model', () => {
    for (const model of MODELS) {
      if (model.kind === 'video') {
        expect(model.maxDurationSeconds).toBe(5);
      } else {
        expect(model.maxDurationSeconds).toBeUndefined();
      }
    }
  });

  it('every model is available: true', () => {
    expect(MODELS.every((m) => m.available === true)).toBe(true);
  });

  it('every model carries a server-only upstreamModel distinct from its public id', () => {
    for (const model of MODELS) {
      expect(model.upstreamModel).toBeTruthy();
      expect(model.upstreamModel).not.toBe(model.id);
    }
  });

  it('previewAssetPath follows the /brand/models/<id>.svg convention', () => {
    for (const model of MODELS) {
      expect(model.previewAssetPath).toBe(`/brand/models/${model.id}.svg`);
    }
  });

  it('providerId is "mock" for every model in M1', () => {
    expect(MODELS.every((m) => m.providerId === 'mock')).toBe(true);
  });

  it('aspectRatios default candidates are present: "1:1" for image models, "16:9" for video models', () => {
    for (const model of MODELS) {
      expect(model.aspectRatios.length).toBeGreaterThan(0);
      if (model.kind === 'image') {
        expect(model.aspectRatios).toContain('1:1');
      } else {
        expect(model.aspectRatios).toContain('16:9');
      }
    }
  });

  it('exactly 4 models are featured, matching the landing page\'s 4 cards', () => {
    expect(MODELS.filter((m) => m.featured).length).toBe(4);
  });

  it('reproduces the price table exactly (api-contract.md §6.3)', () => {
    const priceTable: Record<'image' | 'video', Record<ModelTier, number>> = {
      image: { budget: 30, mid: 250, premium: 600, high_end: 1200 },
      video: { budget: 2500, mid: 5000, premium: 12000, high_end: 24000 },
    };
    for (const model of MODELS) {
      expect(model.priceCredits).toBe(priceTable[model.kind][model.tier]);
    }
  });
});
