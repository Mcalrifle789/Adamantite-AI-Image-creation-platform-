'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import type { CreditLedgerEntry, CreditSnapshot, MediaKind } from '@/lib/shared';
import { apiFetch } from '../apiClient';
import { qk, type LedgerFilter } from '../queryKeys';

/** `GET /api/credits`. architecture.md §9: `staleTime` 0 — the balance must never be stale. */
export function useCredits() {
  return useQuery({
    queryKey: qk.credits,
    queryFn: () => apiFetch<CreditSnapshot>('/credits'),
    staleTime: 0,
  });
}

/** `GET /api/credits/ledger`. */
export function useLedger(filter: LedgerFilter = {}) {
  return useQuery({
    queryKey: qk.ledger(filter),
    queryFn: () =>
      apiFetch<{ items: CreditLedgerEntry[]; nextCursor: string | null }>('/credits/ledger', {
        query: { periodStart: filter.periodStart },
      }),
  });
}

export interface EstimateInput {
  modelId: string;
  kind: MediaKind;
  params?: { durationSeconds?: number };
}

export interface EstimateResponse {
  priceCredits: number;
  balanceCredits: number;
  balanceAfter: number;
  affordable: boolean;
  remainingAtBalance: number;
  cheaperModelIds: string[];
}

/** `POST /api/credits/estimate` — the composer calls this whenever the model or params change,
 * so the Generate button's enabled state and cost line are correct before submitting
 * (api-contract.md §8.3). Read-only; a mutation only because it takes a body, not because it
 * writes anything. */
export function useEstimate() {
  return useMutation({
    mutationFn: (input: EstimateInput) => apiFetch<EstimateResponse>('/credits/estimate', { method: 'POST', body: input }),
  });
}
