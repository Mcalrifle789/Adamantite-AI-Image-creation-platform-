'use client';

import { useQuery } from '@tanstack/react-query';

import type { Plan } from '@/lib/shared';
import { apiFetch } from '../apiClient';
import { qk } from '../queryKeys';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** `GET /api/plans` — public, static. architecture.md §9: `staleTime` 5min. */
export function usePlans() {
  return useQuery({
    queryKey: qk.plans,
    queryFn: () => apiFetch<{ items: Plan[] }>('/plans'),
    staleTime: FIVE_MINUTES_MS,
  });
}
