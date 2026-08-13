import 'server-only';

/**
 * The provider seam's barrel — the one import path the rest of `lib/server/**` (from T-006
 * onward) uses to reach this module. Nothing outside `lib/server/providers/**` should reach past
 * this file into `mock/**` or `registry.ts`/`credentials.ts` directly.
 */

export type {
  GenerationRequest,
  MediaKind,
  ModelBadge,
  ModelCatalogueEntry,
  ModelDescriptor,
  ModelProvider,
  ModelTier,
  ProviderJobHandle,
  ProviderJobStatus,
  ProviderOutput,
} from './types';

export { getProviderCredentials, MOCK_CREDENTIALS_SENTINEL } from './credentials';
export type { ProviderCredentials } from './credentials';

export { createMockProvider } from './mock/mockProvider';
export type { MockProviderOptions } from './mock/mockProvider';

export { getModelDescriptor, getProviderForModel, listModels, toModelSummary } from './registry';
export type { ListModelsFilter, ToModelSummaryContext } from './registry';
