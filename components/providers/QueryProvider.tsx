'use client';

import { useState } from 'react';
import { HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DehydratedState } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export interface QueryProviderProps {
  children: ReactNode;
  /** From a Server Component's `dehydrate(queryClient)` — architecture.md §7: the workspace
   * shell fetches its first-paint data on the server and hands it to this hydration boundary so
   * there is no loading flash. */
  dehydratedState?: DehydratedState;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // architecture.md §9 / ADR-10: staleTime 5min for models/plans, 0 for generations, 30s
        // for projects. `0` is the safe global default (generations); the plans/models/projects
        // hooks in lib/client/queries override it per-endpoint.
        staleTime: 0,
        // Idempotent GETs retry twice with backoff (TanStack's default backoff curve).
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // ADR-10: mutations never auto-retry — a retried POST /api/generations would risk a
        // second charge; the Idempotency-Key makes replay safe, but silent auto-retry is not
        // acceptable behaviour regardless.
        retry: false,
      },
    },
  });
}

// One QueryClient per server render (each request gets its own cache); one shared QueryClient
// for the lifetime of the browser tab (so navigating between routes keeps the cache warm).
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return createQueryClient();
  if (!browserQueryClient) browserQueryClient = createQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children, dehydratedState }: QueryProviderProps) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
