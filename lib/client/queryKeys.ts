/**
 * Reproduces api-contract.md §10 exactly — the same `qk` object, the same key shapes. A3 does
 * not depend on this file, but A7 checks it for consistency against the frozen contract.
 */

import type { GenerationStatus, MediaKind, ModelTier, ProjectStatus } from '@/lib/shared';

export interface ModelsFilter {
  kind?: MediaKind;
  tier?: ModelTier;
  featured?: boolean;
  available?: boolean;
}

export interface ProjectsFilter {
  status?: ProjectStatus;
}

export interface GenerationsFilter {
  projectId?: string;
  status?: GenerationStatus | GenerationStatus[];
  kind?: MediaKind;
}

export interface LedgerFilter {
  periodStart?: string;
}

export const qk = {
  session: ['session'] as const,
  plans: ['plans'] as const,
  models: (f: ModelsFilter = {}) => ['models', f] as const,
  projects: (f: ProjectsFilter = {}) => ['projects', f] as const,
  project: (id: string) => ['project', id] as const,
  messages: (id: string) => ['messages', id] as const,
  generations: (f: GenerationsFilter = {}) => ['generations', f] as const,
  generation: (id: string) => ['generation', id] as const,
  credits: ['credits'] as const,
  ledger: (f: LedgerFilter = {}) => ['ledger', f] as const,
};
