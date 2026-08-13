import 'server-only';

/**
 * The provider seam — the single interface between the platform and any image/video model.
 * Declared verbatim from `.agents/design/architecture.md` §5: field names, optionality, and the
 * discriminated-union shape of `ProviderJobStatus` all match the spec exactly.
 *
 * One addition below the literal spec: `ModelCatalogueEntry`, which layers `priceCredits` and
 * `featured` on top of `ModelDescriptor`. Those two fields are not in architecture.md §5's
 * excerpt, but `config/models.ts` (api-contract.md §3.5) and `registry.toModelSummary()` need
 * them to build the `ModelSummary` DTO — which carries both — without importing `credits/`
 * (forbidden: "providers/** never imports from credits/, services/, db/, app/ or components/").
 * Kept as an additive, separate type rather than widening `ModelDescriptor` itself, so
 * `ModelDescriptor` — the type `GenerationRequest.model` and the rest of the seam use — stays
 * identical to the architecture doc. See `deviations_from_design` in the T-003 work report.
 */

export type MediaKind = 'image' | 'video';
export type ModelTier = 'budget' | 'mid' | 'premium' | 'high_end';
export type ModelBadge = 'latest' | 'new' | 'fast';

export interface ModelDescriptor {
  id: string; // stable public id, e.g. "seedance-2-5"
  providerId: string; // "mock" | "kling" | "openai" | …
  upstreamModel: string; // provider-side identifier — SERVER ONLY
  displayName: string; // "Seedance 2.5"
  kind: MediaKind;
  tier: ModelTier;
  badges: ModelBadge[];
  aspectRatios: string[]; // ["1:1","16:9","9:16","4:3","3:4"]
  maxDurationSeconds?: number; // video only; 5 in M1
  estimatedSeconds: number; // for the progress UI
  previewAssetPath: string; // /brand/models/<id>.svg — a static, bundled preview
  available: boolean;
}

/** See file header. `config/models.ts`'s catalogue and `registry.ts` use this; the rest of the
 * seam (`GenerationRequest.model`, providers) uses plain `ModelDescriptor`. */
export interface ModelCatalogueEntry extends ModelDescriptor {
  priceCredits: number; // integer credits — api-contract.md §6.3's 4×4×2 table, per model
  featured: boolean; // the four cards on the landing page
}

export interface GenerationRequest {
  requestId: string; // our generation id — passed through for provider-side idempotency
  model: ModelDescriptor;
  kind: MediaKind;
  mode: 'create' | 'edit';
  prompt: string;
  params: {
    aspectRatio: string;
    seed: number;
    durationSeconds?: number;
    sourceAsset?: { id: string; mimeType: string; bytes: Uint8Array }; // edit mode
  };
}

export interface ProviderJobHandle {
  providerId: string;
  providerJobId: string;
  submittedAt: string;
}

export interface ProviderOutput {
  mimeType: string; // "image/svg+xml" (mock) | "image/png" | "video/mp4" (real)
  bytes: Uint8Array;
  width: number;
  height: number;
  durationSeconds?: number;
}

export type ProviderJobStatus =
  | { state: 'queued'; progress: 0 }
  | { state: 'running'; progress: number } // 0..100
  | { state: 'succeeded'; progress: 100; outputs: ProviderOutput[]; costMicroUsd?: number }
  | {
      state: 'failed';
      progress: number;
      error: { code: string; message: string; retriable: boolean };
    }
  | { state: 'cancelled'; progress: number };

export interface ModelProvider {
  readonly id: string;
  submit(req: GenerationRequest): Promise<ProviderJobHandle>;
  poll(handle: ProviderJobHandle): Promise<ProviderJobStatus>;
  cancel(handle: ProviderJobHandle): Promise<void>;
}
