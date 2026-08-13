'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Project } from '@/lib/shared';
import { apiFetch } from '../apiClient';
import { qk, type ProjectsFilter } from '../queryKeys';

const THIRTY_SECONDS_MS = 30 * 1000;

/** `GET /api/projects`. architecture.md §9: `staleTime` 30s. */
export function useProjects(filter: ProjectsFilter = {}) {
  return useQuery({
    queryKey: qk.projects(filter),
    queryFn: () => apiFetch<{ items: Project[]; nextCursor: string | null }>('/projects', {
      query: { status: filter.status },
    }),
    staleTime: THIRTY_SECONDS_MS,
  });
}

/** `GET /api/projects/{id}`. */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: qk.project(id ?? ''),
    queryFn: () => apiFetch<Project>(`/projects/${id}`),
    enabled: Boolean(id),
    staleTime: THIRTY_SECONDS_MS,
  });
}

function invalidateProjectLists(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ['projects'] });
  if (id) void queryClient.invalidateQueries({ queryKey: qk.project(id) });
}

/** `POST /api/projects` — the landing composer's first step; it does not start a generation
 * (api-contract.md §5.2). */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; defaultModelId?: string; initialPrompt?: string } = {}) =>
      apiFetch<Project>('/projects', { method: 'POST', body, idempotent: true }),
    onSuccess: (project) => invalidateProjectLists(queryClient, project.id),
  });
}

/** `PATCH /api/projects/{id}` — used for rename, which is optimistic (ux-patterns.md §13). */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; defaultModelId?: string | null }) =>
      apiFetch<Project>(`/projects/${id}`, { method: 'PATCH', body, idempotent: true }),
    onMutate: async ({ id, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: qk.project(id) });
      const previous = queryClient.getQueryData<Project>(qk.project(id));
      if (previous) {
        queryClient.setQueryData<Project>(qk.project(id), { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) queryClient.setQueryData(qk.project(id), context.previous);
    },
    onSettled: (_data, _error, { id }) => invalidateProjectLists(queryClient, id),
  });
}

/** `DELETE /api/projects/{id}` — permanent; the route itself requires the project be trashed
 * first (api-contract.md §5.7), so this mutation is only ever reachable from the Trash view. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<undefined>(`/projects/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: qk.project(id) });
      invalidateProjectLists(queryClient);
    },
  });
}

/** `POST /api/projects/{id}/trash` — optimistic (ux-patterns.md §13: "cheap, reversible, instant
 * feel"), with rollback on error. */
export function useTrashProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Project>(`/projects/${id}/trash`, { method: 'POST', idempotent: true }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: qk.project(id) });
      const previous = queryClient.getQueryData<Project>(qk.project(id));
      if (previous) {
        queryClient.setQueryData<Project>(qk.project(id), {
          ...previous,
          status: 'trashed',
          trashedAt: new Date().toISOString(),
        });
      }
      return { previous };
    },
    onError: (_error, id, context) => {
      if (context?.previous) queryClient.setQueryData(qk.project(id), context.previous);
    },
    onSettled: (_data, _error, id) => invalidateProjectLists(queryClient, id),
  });
}

/** `POST /api/projects/{id}/restore` — optimistic, mirrors `useTrashProject`. */
export function useRestoreProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Project>(`/projects/${id}/restore`, { method: 'POST', idempotent: true }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: qk.project(id) });
      const previous = queryClient.getQueryData<Project>(qk.project(id));
      if (previous) {
        queryClient.setQueryData<Project>(qk.project(id), {
          ...previous,
          status: 'active',
          trashedAt: null,
        });
      }
      return { previous };
    },
    onError: (_error, id, context) => {
      if (context?.previous) queryClient.setQueryData(qk.project(id), context.previous);
    },
    onSettled: (_data, _error, id) => invalidateProjectLists(queryClient, id),
  });
}

/** `POST /api/projects/{id}/duplicate` — never optimistic; it costs a project-limit slot and
 * copies real rows server-side. */
export function useDuplicateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      apiFetch<Project>(`/projects/${id}/duplicate`, { method: 'POST', body: { name }, idempotent: true }),
    onSuccess: (project) => invalidateProjectLists(queryClient, project.id),
  });
}
