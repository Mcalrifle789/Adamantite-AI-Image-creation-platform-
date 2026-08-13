/**
 * Wire-format DTOs — the exact shapes the client receives, mirrored from
 * `.agents/design/api-contract.md` §2 field-for-field: same names, same optionality (`?`),
 * same nullability (`| null`). This file is a type-only mirror of the frozen contract: no
 * logic, no defaults, nothing computed.
 */

export type MediaKind = 'image' | 'video';
export type ModelTier = 'budget' | 'mid' | 'premium' | 'high_end';
export type PlanId = 'port' | 'standard' | 'pro' | 'max';
export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type GenerationMode = 'create' | 'edit';
export type ProjectStatus = 'active' | 'trashed';
export type ModelBadge = 'latest' | 'new' | 'fast';
export type PlanAccent = 'blue' | 'cyan' | 'purple' | 'magenta';
export type ChatMessageRole = 'user' | 'assistant';
export type ChatMessageStatus = 'complete' | 'pending' | 'failed';
export type LedgerEntryKind = 'grant' | 'debit_reserve' | 'refund' | 'settle_adjustment' | 'expire';

export interface User {
  id: string;
  displayName: string;
  email: string | null; // null for the M1 demo user
  createdAt: string;
}

export interface Plan {
  id: PlanId;
  name: string; // "Port"
  priceCents: number; // 799
  currency: 'USD';
  monthlyCredits: number; // 39950
  concurrency: number; // max simultaneous queued+running generations
  accent: PlanAccent; // drives the pricing-card hue ramp
  order: number; // 1..4, display order
  highlights: string[]; // marketing bullets, pre-written server-side
  quotas: PlanQuota[]; // derived from monthlyCredits / unitPriceCredits
}

export interface PlanQuota {
  kind: MediaKind;
  tier: ModelTier;
  unitPriceCredits: number; // 600
  approxPerMonth: number; // floor(monthlyCredits / unitPriceCredits)
  label: string; // "~133 premium images"
}

export interface Subscription {
  id: string;
  planId: PlanId;
  status: 'active'; // only value in M1 — no cancellation flow
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
}

export interface CreditSnapshot {
  balanceCredits: number; // spendable now (grants − debits + refunds)
  grantedCredits: number; // granted this period
  usedCredits: number; // net spent this period (reserves − refunds)
  reservedCredits: number; // held by queued/running generations
  periodStart: string;
  periodEnd: string;
  quotas: QuotaRow[];
}

export interface QuotaRow {
  kind: MediaKind;
  tier: ModelTier;
  unitPriceCredits: number;
  remaining: number; // floor(balanceCredits / unitPriceCredits)
  usedThisPeriod: number; // count of succeeded generations in this bucket
}

export interface ModelSummary {
  id: string; // "seedance-2-5" — public id; NEVER the upstream model id
  displayName: string; // "Seedance 2.5"
  kind: MediaKind;
  tier: ModelTier;
  tierLabel: string; // "Premium"
  badges: ModelBadge[];
  priceCredits: number; // 600
  estimatedSeconds: number; // 5 | 14 — drives the progress UI
  aspectRatios: string[]; // ["1:1","16:9","9:16","4:3","3:4"]
  maxDurationSeconds: number | null; // 5 for video, null for image
  previewUrl: string; // "/brand/models/seedance-2-5.svg" — static, bundled
  featured: boolean; // the four cards on the landing page
  available: boolean;
  // Present only when the request carries a session:
  affordable?: boolean; // priceCredits <= balanceCredits
  remainingAtBalance?: number; // floor(balanceCredits / priceCredits)
}

export interface Project {
  id: string;
  name: string; // 1..80 chars
  status: ProjectStatus;
  defaultModelId: string | null;
  coverAssetId: string | null; // most recent succeeded asset
  generationCount: number;
  messageCount: number;
  duplicatedFromId: string | null;
  createdAt: string;
  updatedAt: string;
  trashedAt: string | null;
}

export interface Asset {
  id: string;
  generationId: string;
  projectId: string;
  kind: MediaKind;
  mimeType: string; // "image/svg+xml" in M1; "image/png" | "video/mp4" later
  width: number;
  height: number;
  durationSeconds: number | null;
  byteSize: number;
  contentUrl: string; // "/api/assets/ast_.../content"
  downloadUrl: string; // "/api/assets/ast_.../content?download=1"
  createdAt: string;
}

export interface GenerationParams {
  aspectRatio: string;
  seed: number;
  durationSeconds: number | null;
  sourceAssetId: string | null; // set when mode === 'edit'
}

export interface GenerationError {
  code: string;
  message: string;
  retriable: boolean;
}

export interface Generation {
  id: string;
  projectId: string;
  modelId: string;
  modelDisplayName: string; // denormalised so the HUD label needs no second fetch
  kind: MediaKind;
  mode: GenerationMode;
  prompt: string;
  params: GenerationParams;
  status: GenerationStatus;
  progress: number; // 0..100, monotonic within a generation
  priceCredits: number; // what was reserved
  estimatedSeconds: number;
  assets: Asset[]; // empty until succeeded
  error: GenerationError | null;
  retryOfId: string | null;
  resultMessageId: string | null; // set when this generation was created from a chat message
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  // Polling directive — see api-contract.md §4.2
  pollAfterMs: number | null; // null on terminal states
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: ChatMessageRole;
  content: string; // '' while an assistant message is pending
  status: ChatMessageStatus;
  generationId: string | null; // set when this message produced or reports a generation
  attachmentAssetIds: string[];
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  kind: LedgerEntryKind;
  deltaCredits: number; // signed: grants/refunds positive, debits negative
  balanceAfter: number;
  reason: string; // "generation" | "plan_change" | "period_rollover" | …
  generationId: string | null;
  periodStart: string;
  createdAt: string;
}
