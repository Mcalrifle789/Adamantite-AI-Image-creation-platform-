'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Generation } from '@/lib/shared';
import { apiFetch, ApiError } from '../apiClient';

export interface UsePollGenerationOptions {
  enabled?: boolean;
  /** Injectable so the polling protocol can be unit-tested without a running server. Defaults
   * to the real `GET /api/generations/{id}`. */
  fetcher?: (id: string, signal?: AbortSignal) => Promise<Generation>;
}

export interface UsePollGenerationResult {
  data: Generation | undefined;
  error: Error | null;
  isLoading: boolean;
  /** True from the SECOND consecutive poll failure until a poll succeeds again —
   * api-contract.md §4.2. */
  reconnecting: boolean;
}

/** 2s -> 4s -> 10s -> 10s… indexed by (consecutive failures - 1), clamped at the last entry. */
const BACKOFF_MS = [2000, 4000, 10000];

function defaultFetcher(id: string, signal?: AbortSignal): Promise<Generation> {
  return apiFetch<Generation>(`/generations/${id}`, { signal });
}

/**
 * api-contract.md §4.2 (normative) — this is *the* poll endpoint client, and in M1 calling it is
 * what advances the mock (ADR-08), so this hook must never "optimise away" a poll:
 *
 * - Waits **exactly** `pollAfterMs` from the last response before polling again.
 * - Stops when `pollAfterMs` is `null` (a terminal status).
 * - On a network error or 5xx, backs off 2s -> 4s -> 10s -> 10s…, and sets `reconnecting` true
 *   after the second consecutive failure. It never gives up while the tab is visible.
 * - Pauses while `document.visibilityState === 'hidden'` and resumes with an immediate poll.
 * - Never invents an interval faster than the server-directed one.
 */
export function usePollGeneration(
  id: string | undefined,
  options: UsePollGenerationOptions = {},
): UsePollGenerationResult {
  const { enabled = true, fetcher = defaultFetcher } = options;

  const [data, setData] = useState<Generation>();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const disposedRef = useRef(false);
  const pausedRef = useRef(typeof document !== 'undefined' && document.visibilityState === 'hidden');
  const pollRef = useRef<() => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const schedule = useCallback(
    (delayMs: number) => {
      clearTimer();
      if (pausedRef.current) return; // resumes via the visibilitychange handler instead
      timeoutRef.current = setTimeout(() => pollRef.current(), delayMs);
    },
    [clearTimer],
  );

  const poll = useCallback(async () => {
    if (disposedRef.current || !id) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await fetcher(id, controller.signal);
      if (disposedRef.current) return;

      consecutiveFailuresRef.current = 0;
      setReconnecting(false);
      setError(null);
      setData(result);
      setIsLoading(false);

      if (result.pollAfterMs != null) {
        schedule(result.pollAfterMs);
      } else {
        clearTimer();
      }
    } catch (err) {
      if (disposedRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;

      const failure = err instanceof Error ? err : new Error('Unknown polling error');
      const isNetworkOrServerError = !(failure instanceof ApiError) || failure.status >= 500;

      if (!isNetworkOrServerError) {
        // A definitive client error (e.g. 404) — stop polling and surface it.
        setError(failure);
        setIsLoading(false);
        clearTimer();
        return;
      }

      consecutiveFailuresRef.current += 1;
      setError(failure);
      setIsLoading(false);
      if (consecutiveFailuresRef.current >= 2) setReconnecting(true);

      const backoffIndex = Math.min(consecutiveFailuresRef.current - 1, BACKOFF_MS.length - 1);
      schedule(BACKOFF_MS[backoffIndex] ?? 10000);
    }
  }, [id, fetcher, schedule, clearTimer]);

  useEffect(() => {
    pollRef.current = () => void poll();
  }, [poll]);

  useEffect(() => {
    if (!enabled || !id) return undefined;
    disposedRef.current = false;
    pollRef.current();

    function handleVisibility() {
      const hidden = document.visibilityState === 'hidden';
      pausedRef.current = hidden;
      clearTimer();
      if (!hidden) pollRef.current(); // resume with an immediate poll
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposedRef.current = true;
      clearTimer();
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, id, clearTimer]);

  return { data, error, isLoading, reconnecting };
}
