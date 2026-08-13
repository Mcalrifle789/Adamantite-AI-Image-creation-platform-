'use client';

import { useQuery } from '@tanstack/react-query';

import type { ModelSummary } from '@/lib/shared';
import { apiFetch } from '../apiClient';
import { qk, type ModelsFilter } from '../queryKeys';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** `GET /api/models` — public, enriched (`affordable`, `remainingAtBalance`) with a session.
 * architecture.md §9: `staleTime` 5min. Re-invalidated on any generation reaching terminal,
 * since that changes every card's `affordable` flag (api-contract.md §10). */
export function useModels(filter: ModelsFilter = {}) {
  return useQuery({
    queryKey: qk.models(filter),
    queryFn: () =>
      apiFetch<{ items: ModelSummary[] }>('/models', {
        query: {
          kind: filter.kind,
          tier: filter.tier,
          featured: filter.featured,
          available: filter.available,
        },
      }),
    staleTime: FIVE_MINUTES_MS,
  });
}
