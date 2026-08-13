'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Generation, GenerationMode, MediaKind } from '@/lib/shared';
import { apiFetch } from '../apiClient';
import { usePollGeneration, type UsePollGenerationResult } from '../hooks/usePollGeneration';
import { qk, type GenerationsFilter } from '../queryKeys';

/** `GET /api/generations`. architecture.md §9: `staleTime` 0 — generation lists are never
 * considered fresh, since the whole point is watching them change. */
export function useGenerations(filter: GenerationsFilter = {}) {
  return useQuery({
    queryKey: qk.generations(filter),
    queryFn: () =>
      apiFetch<{ items: Generation[]; nextCursor: string | null }>('/generations', {
        query: {
          projectId: filter.projectId,
          status: filter.status,
          kind: filter.kind,
        },
      }),
    staleTime: 0,
  });
}

export interface CreateGenerationInput {
  projectId: string;
  modelId: string;
  prompt: string;
  kind: MediaKind;
  mode?: GenerationMode;
  params?: {
    aspectRatio?: string;
    seed?: number;
    durationSeconds?: number;
    sourceAssetId?: string;
  };
}

/** `POST /api/generations` — **`Idempotency-Key` required**, never optimistic (it charges
 * credits; ux-patterns.md §13). */
export function useCreateGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGenerationInput) =>
      apiFetch<Generation>('/generations', { method: 'POST', body: input, idempotent: true }),
    onSuccess: (generation) => {
      queryClient.setQueryData(qk.generation(generation.id), generation);
      void queryClient.invalidateQueries({ queryKey: qk.generations({ projectId: generation.projectId }) });
      void queryClient.invalidateQueries({ queryKey: qk.credits });
    },
  });
}

/**
 * `GET /api/generations/{id}` — the poll endpoint. Wraps `usePollGeneration` (the normative
 * client from api-contract.md §4.2) and, once the generation reaches a terminal state, runs the
 * invalidation rule from api-contract.md §10: `generation(id)`, `generations({projectId})`,
 * `project(projectId)`, `messages(projectId)`, `credits`, and `models()`.
 */
export function useGeneration(
  id: string | undefined,
  options: { enabled?: boolean } = {},
): UsePollGenerationResult {
  const queryClient = useQueryClient();
  const result = usePollGeneration(id, options);

  useEffect(() => {
    if (!id || !result.data) return;
    // Fresher than an invalidation could produce — we already hold the authoritative response.
    queryClient.setQueryData(qk.generation(id), result.data);

    if (result.data.pollAfterMs === null) {
      const { projectId } = result.data;
      void queryClient.invalidateQueries({ queryKey: qk.generations({ projectId }) });
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.messages(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.credits });
      void queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  }, [id, result.data, queryClient]);

  return result;
}

/** `POST /api/generations/{id}/cancel` — refunds the reserve in the same request. */
export function useCancelGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Generation>(`/generations/${id}/cancel`, { method: 'POST', idempotent: true }),
    onSuccess: (generation) => {
      queryClient.setQueryData(qk.generation(generation.id), generation);
      void queryClient.invalidateQueries({ queryKey: qk.generations({ projectId: generation.projectId }) });
      void queryClient.invalidateQueries({ queryKey: qk.credits });
    },
  });
}

/** `POST /api/generations/{id}/retry` — **`Idempotency-Key` required**; charged again, never
 * optimistic (api-contract.md §4.5). */
export function useRetryGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Generation>(`/generations/${id}/retry`, { method: 'POST', idempotent: true }),
    onSuccess: (generation) => {
      queryClient.setQueryData(qk.generation(generation.id), generation);
      void queryClient.invalidateQueries({ queryKey: qk.generations({ projectId: generation.projectId }) });
      void queryClient.invalidateQueries({ queryKey: qk.credits });
    },
  });
}
