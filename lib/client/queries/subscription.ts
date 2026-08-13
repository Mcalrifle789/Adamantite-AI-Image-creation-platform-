'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreditSnapshot, Plan, PlanId, Subscription } from '@/lib/shared';
import { apiFetch } from '../apiClient';

export interface SubscribeResponse {
  subscription: Subscription;
  plan: Plan;
  credits: CreditSnapshot;
}

/** `POST /api/subscription` — mock, no payment processed (api-contract.md §8.4). On success,
 * invalidate everything: it changes the plan, starts a new billing period, and re-derives every
 * model's `affordable` flag (api-contract.md §10). */
export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: PlanId) =>
      apiFetch<SubscribeResponse>('/subscription', { method: 'POST', body: { planId }, idempotent: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
