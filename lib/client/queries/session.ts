'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreditSnapshot, Plan, PlanId, Subscription, User } from '@/lib/shared';
import { apiFetch } from '../apiClient';
import { qk } from '../queryKeys';

export interface SessionResponse {
  user: User;
  subscription: Subscription;
  plan: Plan;
  credits: CreditSnapshot;
}

/** `GET /api/session`. A 401 means "logged out" — callers render the public landing page, not
 * an error toast (api-contract.md §3.1). */
export function useSession() {
  return useQuery({
    queryKey: qk.session,
    queryFn: () => apiFetch<SessionResponse>('/session'),
    retry: (failureCount, error) => {
      const status = (error as { status?: number }).status;
      if (status === 401) return false;
      return failureCount < 2;
    },
  });
}

/** `POST /api/session` — development only; 403s in production (api-contract.md §3.2). */
export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { planId?: PlanId } = {}) =>
      apiFetch<SessionResponse>('/session', { method: 'POST', body, idempotent: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.session, data);
      void queryClient.invalidateQueries({ queryKey: qk.models() });
    },
  });
}

/** `DELETE /api/session`. */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<undefined>('/session', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: qk.session });
      void queryClient.invalidateQueries();
    },
  });
}
