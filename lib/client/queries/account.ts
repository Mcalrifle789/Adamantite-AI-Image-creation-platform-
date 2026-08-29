'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AccountSession } from '@/lib/shared';
import type { LoginInput, RegisterInput, UpdateAccountInput } from '@/lib/shared/auth-schemas';
import { ApiError, apiFetch } from '../apiClient';
import { qk } from '../queryKeys';

/**
 * Account hooks. All four share one cache key (`qk.session`) so the header avatar, the account
 * page, and any future credit readout can never disagree about who is signed in.
 */

/**
 * `GET /api/session`. A 401 is a *state*, not an error: it means signed out. Returning `null`
 * for it (instead of letting the query fail) is what lets the header render the signed-out
 * buttons without an error boundary or a toast.
 */
export function useAccountSession() {
  return useQuery<AccountSession | null>({
    queryKey: qk.session,
    queryFn: async () => {
      try {
        return await apiFetch<AccountSession>('/session');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

/** Field-level messages the API attached, e.g. `{ email: 'That email is already registered.' }`. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const details = error.details as { fieldErrors?: Record<string, string> } | undefined;
  return details?.fieldErrors ?? {};
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterInput) =>
      apiFetch<AccountSession>('/auth/register', { method: 'POST', body }),
    onSuccess: (data) => queryClient.setQueryData(qk.session, data),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginInput) =>
      apiFetch<AccountSession>('/auth/login', { method: 'POST', body }),
    onSuccess: (data) => queryClient.setQueryData(qk.session, data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<undefined>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      // Write `null` rather than removing the key: a removed query refetches and flashes the
      // signed-in header for a frame before the 401 lands.
      queryClient.setQueryData(qk.session, null);
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAccountInput) =>
      apiFetch<AccountSession>('/account', { method: 'PATCH', body }),
    onSuccess: (data) => queryClient.setQueryData(qk.session, data),
  });
}
