'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ChatMessage, Generation } from '@/lib/shared';
import { apiFetch } from '../apiClient';
import { qk } from '../queryKeys';

/** `GET /api/projects/{id}/messages` — oldest-first (api-contract.md §6.1). */
export function useMessages(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.messages(projectId ?? ''),
    queryFn: () =>
      apiFetch<{ items: ChatMessage[]; nextCursor: string | null }>(`/projects/${projectId}/messages`),
    enabled: Boolean(projectId),
  });
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  generation: Generation | null;
}

/** `POST /api/projects/{id}/messages` — **`Idempotency-Key` required** (api-contract.md §6.2).
 * May trigger a generation (an edit); the caller is responsible for handing `generation.id` off
 * to `useGeneration` to start polling. Never optimistic — the credit gate can reject it. */
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      ...body
    }: {
      projectId: string;
      content: string;
      attachmentAssetIds?: string[];
      modelId?: string;
    }) =>
      apiFetch<SendMessageResponse>(`/projects/${projectId}/messages`, {
        method: 'POST',
        body,
        idempotent: true,
      }),
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.messages(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
    },
  });
}
