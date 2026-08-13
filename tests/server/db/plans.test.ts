import { describe, expect, it } from 'vitest';

import { ORDERED_PLAN_IDS, PLANS, toPlanDto } from '../../../config/plans';

describe('PLANS', () => {
  it('defines exactly four plans: port, standard, pro, max', () => {
    expect(Object.keys(PLANS).sort()).toEqual(['max', 'port', 'pro', 'standard']);
  });

  it('prices match the spec exactly, in integer cents', () => {
    expect(PLANS.port.priceCents).toBe(799);
    expect(PLANS.standard.priceCents).toBe(1_599);
    expect(PLANS.pro.priceCents).toBe(2_999);
    expect(PLANS.max.priceCents).toBe(9_999);
  });

  it('monthlyCredits match ADR-03 exactly', () => {
    expect(PLANS.port.monthlyCredits).toBe(39_950);
    expect(PLANS.standard.monthlyCredits).toBe(79_950);
    expect(PLANS.pro.monthlyCredits).toBe(149_950);
    expect(PLANS.max.monthlyCredits).toBe(499_950);
  });

  it('REQ-07: monthlyCredits is exactly half of the subscription price, in credits (1 credit = $0.0001)', () => {
    // priceCents is in whole cents ($0.01); a credit is $0.0001, i.e. 1 cent = 100 credits.
    // Half the price in credits is therefore `priceCents * 100 / 2`, which is always an exact
    // integer for these four (odd) priceCents values because the /2 and the *100 never lose a
    // fractional credit — `priceCents * 50` computes the identical value without an intermediate
    // rounding step.
    for (const plan of Object.values(PLANS)) {
      expect(plan.monthlyCredits).toBe((plan.priceCents * 100) / 2);
      expect(plan.monthlyCredits).toBe(plan.priceCents * 50);
    }
  });

  it('concurrency caps match architecture.md §6.4: Port 1, Standard 2, Pro 4, Max 8', () => {
    expect(PLANS.port.concurrency).toBe(1);
    expect(PLANS.standard.concurrency).toBe(2);
    expect(PLANS.pro.concurrency).toBe(4);
    expect(PLANS.max.concurrency).toBe(8);
  });

  it('accents are blue / cyan / purple / magenta for port / standard / pro / max', () => {
    expect(PLANS.port.accent).toBe('blue');
    expect(PLANS.standard.accent).toBe('cyan');
    expect(PLANS.pro.accent).toBe('purple');
    expect(PLANS.max.accent).toBe('magenta');
  });

  it('order is 1..4 and ORDERED_PLAN_IDS reflects it', () => {
    expect(PLANS.port.order).toBe(1);
    expect(PLANS.standard.order).toBe(2);
    expect(PLANS.pro.order).toBe(3);
    expect(PLANS.max.order).toBe(4);
    expect(ORDERED_PLAN_IDS).toEqual(['port', 'standard', 'pro', 'max']);
  });

  it('every plan has at least one non-empty, pre-written marketing highlight', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.highlights.length).toBeGreaterThan(0);
      for (const highlight of plan.highlights) {
        expect(typeof highlight).toBe('string');
        expect(highlight.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every plan is priced in USD', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.currency).toBe('USD');
    }
  });
});

describe('toPlanDto', () => {
  it('assembles the wire Plan DTO from a plan id and caller-supplied quotas', () => {
    const quotas = [
      {
        kind: 'image' as const,
        tier: 'premium' as const,
        unitPriceCredits: 600,
        approxPerMonth: 66,
        label: '≈66 premium images',
      },
    ];

    const dto = toPlanDto('port', quotas);

    expect(dto).toEqual({
      id: 'port',
      name: 'Port',
      priceCents: 799,
      currency: 'USD',
      monthlyCredits: 39_950,
      concurrency: 1,
      accent: 'blue',
      order: 1,
      highlights: PLANS.port.highlights,
      quotas,
    });
  });

  it('performs no derivation of its own — an empty quotas array passes straight through', () => {
    const dto = toPlanDto('max', []);
    expect(dto.quotas).toEqual([]);
  });
});
