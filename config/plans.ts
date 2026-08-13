import 'server-only';

import type { Plan, PlanAccent, PlanId, PlanQuota } from '../lib/shared/api-types';
import { PLAN_IDS } from '../lib/shared/constants';

/**
 * Server-only static plan config — never a database table (data-model.md §2: "`Plan` — NOT a
 * table... versioned with the deploy and must never be user-editable"). Values are
 * architecture.md §6.2's grant table and ADR-03's derivation: **monthly grant = 50% of the plan
 * price**, in whole credits (`1 credit = US$0.0001`).
 *
 * The per-model-tier unit price table (ADR-03's 8-number matrix) and the `quotaSnapshot`/`PlanQuota[]`
 * derivation logic belong to `lib/server/credits/pricing.ts` — a later task (T-006), out of this
 * task's scope. This module exports only the mapper shape: {@link toPlanDto} takes already-derived
 * `quotas` and merges them with this file's static fields into the wire `Plan` DTO. `PlanQuota[]`
 * is therefore never hard-coded here — only the highlights copy is, and even that is written to
 * ADR-03's numbers as marketing text, not computed from them, which is why every quota-shaped
 * claim in a highlight is prefixed `≈` (ADR-03 "Consequences": "product cannot say 'you get
 * exactly 133 premium images'... the correct phrasing... is '≈133'").
 */

/** The static, per-plan fields of the `Plan` DTO — everything except the derived `quotas`. */
export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceCents: number;
  currency: 'USD';
  monthlyCredits: number;
  concurrency: number;
  accent: PlanAccent;
  order: number;
  highlights: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  port: {
    id: 'port',
    name: 'Port',
    priceCents: 799,
    currency: 'USD',
    monthlyCredits: 39_950,
    concurrency: 1,
    accent: 'blue',
    order: 1,
    highlights: [
      '≈1,331 budget images or 66 premium images a month',
      '1 generation in flight at a time',
      'Every model in the catalogue — no tier lock-out',
      'Upgrade any time; your next period starts immediately',
    ],
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    priceCents: 1_599,
    currency: 'USD',
    monthlyCredits: 79_950,
    concurrency: 2,
    accent: 'cyan',
    order: 2,
    highlights: [
      '≈2,665 budget images or 133 premium images a month',
      '2 generations in flight together',
      'Double the monthly credits of Port',
      'Full access to video generation',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCents: 2_999,
    currency: 'USD',
    monthlyCredits: 149_950,
    concurrency: 4,
    accent: 'purple',
    order: 3,
    highlights: [
      '≈4,998 budget images or 249 premium images a month',
      '4 generations in flight together — batch your ideas',
      '≈12 premium videos a month',
      'The best credits-per-dollar tier',
    ],
  },
  max: {
    id: 'max',
    name: 'Max',
    priceCents: 9_999,
    currency: 'USD',
    monthlyCredits: 499_950,
    concurrency: 8,
    accent: 'magenta',
    order: 4,
    highlights: [
      '≈16,665 budget images or 833 premium images a month',
      '8 generations in flight together — studio-scale throughput',
      '≈41 premium videos a month',
      'Built for teams and power users',
    ],
  },
};

/**
 * Maps a plan id plus its already-derived quota rows into the wire `Plan` DTO
 * (api-contract.md §2). `quotas` is supplied by the caller (T-006's `lib/server/credits/pricing.ts`
 * in the running app; a hand-built fixture in this task's own unit test) — this function performs
 * no derivation itself, only assembly, so it has nothing to get out of sync with the price table.
 */
export function toPlanDto(planId: PlanId, quotas: PlanQuota[]): Plan {
  const definition = PLANS[planId];
  return {
    id: definition.id,
    name: definition.name,
    priceCents: definition.priceCents,
    currency: definition.currency,
    monthlyCredits: definition.monthlyCredits,
    concurrency: definition.concurrency,
    accent: definition.accent,
    order: definition.order,
    highlights: definition.highlights,
    quotas,
  };
}

/** All four plans, ordered by `order` — `GET /api/plans` (api-contract.md §3.4) renders exactly
 * this list, once each plan's `quotas` is filled in by the credits module. */
export const ORDERED_PLAN_IDS: PlanId[] = [...PLAN_IDS].sort(
  (a, b) => PLANS[a].order - PLANS[b].order,
);
