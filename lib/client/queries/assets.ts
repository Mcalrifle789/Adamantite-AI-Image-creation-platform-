'use client';

import { useQuery } from '@tanstack/react-query';

import type { Asset } from '@/lib/shared';
import { apiFetch } from '../apiClient';

/** `GET /api/assets/{id}` — metadata only. Bytes are served by `asset.contentUrl` /
 * `asset.downloadUrl` directly (consumed as `<img src>` / `<video src>` / a download link), so
 * there is no separate hook for the content route (api-contract.md §7.2). */
export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['asset', id] as const,
    queryFn: () => apiFetch<Asset>(`/assets/${id}`),
    enabled: Boolean(id),
    staleTime: Infinity, // asset bytes and metadata are immutable once written
  });
}
