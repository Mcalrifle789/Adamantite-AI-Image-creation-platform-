import 'server-only';

import type { Clock } from '../../clock';
import { env } from '../../env';
import { getProviderCredentials } from '../credentials';
import type {
  GenerationRequest,
  MediaKind,
  ModelProvider,
  ProviderJobHandle,
  ProviderJobStatus,
} from '../types';
import { hashString, synthesizeArt } from './svgArt';
import { computeTimelineState } from './timeline';

/**
 * The M1 mock adapter — architecture.md §5.1 / ADR-02. No timers, no background workers: every
 * `poll` recomputes job state from `clock.now() − submittedAt` against a scripted timeline.
 *
 * All the information a poll needs (prompt, seed, model id, estimated duration, kind, aspect
 * ratio) travels inside the opaque `providerJobId` itself, because the fixed `ProviderJobHandle`
 * shape carries nothing else. This is what keeps the provider stateless across calls for
 * everything a pure function of elapsed time can express. The one thing it genuinely cannot
 * express — cancellation — is held in a small in-memory map keyed by job id, scoped to one
 * provider instance. That is an acceptable amount of state for a single-process mock: this
 * codebase is explicitly single-process in M1 (architecture.md §8, "Multi-process is explicitly
 * unsupported").
 */

const PROVIDER_ID = 'mock';
const FAIL_PROMPT_PATTERN = /\bfail\b/i;
const HASH_MODULUS = 0x100000000; // 2^32 — hashString's output range
const COST_BASE_MICRO_USD_PER_SECOND = 900; // an arbitrary, self-consistent mock unit cost

interface MockJobPayload {
  requestId: string;
  modelId: string;
  prompt: string;
  seed: number;
  kind: MediaKind;
  aspectRatio: string;
  estimatedSeconds: number;
}

function encodeJobId(payload: MockJobPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeJobId(providerJobId: string): MockJobPayload {
  const json = Buffer.from(providerJobId, 'base64url').toString('utf8');
  return JSON.parse(json) as MockJobPayload;
}

/** Deterministic failure injection — architecture.md §5.1: the prompt trigger always wins;
 * otherwise `MOCK_FAILURE_RATE` fires against a hash of `requestId`, so the same request always
 * resolves the same way (no coin-flip that differs between polls of the same job). */
function shouldFail(payload: MockJobPayload, failureRate: number): boolean {
  if (FAIL_PROMPT_PATTERN.test(payload.prompt)) return true;
  if (failureRate <= 0) return false;
  const normalized = hashString(`${payload.requestId}::failure`) / HASH_MODULUS;
  return normalized < failureRate;
}

/** A plausible per-generation cost in microUSD, derived from the model's own estimated duration
 * — not from the credit price table, because the provider seam knows nothing about credits
 * (architecture.md §5). This gives the ledger's `settle_adjustment` path (architecture.md §6.4) a
 * real, non-zero delta to reconcile against the reserve `credits/pricing` computes independently,
 * rather than the settlement path always seeing a delta of zero. */
function computeCostMicroUsd(payload: MockJobPayload): number {
  const normalized = hashString(`${payload.requestId}::cost`) / HASH_MODULUS;
  const variance = 0.85 + normalized * 0.3; // ±15%
  return Math.round(payload.estimatedSeconds * COST_BASE_MICRO_USD_PER_SECOND * variance);
}

export interface MockProviderOptions {
  clock: Clock;
  /** Defaults to `env.MOCK_LATENCY_SCALE`. Tests inject `0` to collapse every duration to zero. */
  latencyScale?: number;
  /** Defaults to `env.MOCK_FAILURE_RATE`. */
  failureRate?: number;
}

export function createMockProvider(options: MockProviderOptions): ModelProvider {
  const { clock } = options;
  const latencyScale = options.latencyScale ?? env.MOCK_LATENCY_SCALE;
  const failureRate = options.failureRate ?? env.MOCK_FAILURE_RATE;

  /** providerJobId -> the progress frozen at the moment `cancel` was called. */
  const cancelledJobs = new Map<string, number>();

  function elapsedMsSince(submittedAt: string): number {
    return Math.max(0, clock.now().getTime() - new Date(submittedAt).getTime());
  }

  async function submit(req: GenerationRequest): Promise<ProviderJobHandle> {
    // Exercises the real credential-access code path from day one (architecture.md §4). The mock
    // does not need the key, but must read it the same way a real adapter would; the value is
    // never used, returned, or logged here.
    getProviderCredentials();

    const payload: MockJobPayload = {
      requestId: req.requestId,
      modelId: req.model.id,
      prompt: req.prompt,
      seed: req.params.seed,
      kind: req.kind,
      aspectRatio: req.params.aspectRatio,
      estimatedSeconds: req.model.estimatedSeconds,
    };

    return {
      providerId: PROVIDER_ID,
      providerJobId: encodeJobId(payload),
      submittedAt: clock.now().toISOString(),
    };
  }

  async function poll(handle: ProviderJobHandle): Promise<ProviderJobStatus> {
    const frozenProgress = cancelledJobs.get(handle.providerJobId);
    if (frozenProgress !== undefined) {
      return { state: 'cancelled', progress: frozenProgress };
    }

    const payload = decodeJobId(handle.providerJobId);
    const elapsedMs = elapsedMsSince(handle.submittedAt);
    const timeline = computeTimelineState(elapsedMs, payload.estimatedSeconds, latencyScale);

    if (timeline.phase === 'queued') {
      return { state: 'queued', progress: 0 };
    }
    if (timeline.phase === 'running') {
      return { state: 'running', progress: timeline.progress };
    }

    // timeline.phase === 'succeeded': the job has reached its terminal point. Whether that
    // terminal point is actually a success is decided here, deterministically.
    if (shouldFail(payload, failureRate)) {
      return {
        state: 'failed',
        progress: 100,
        error: {
          code: 'PROVIDER_REJECTED',
          message: `The mock provider rejected this request for model "${payload.modelId}".`,
          retriable: true,
        },
      };
    }

    const output = synthesizeArt({
      prompt: payload.prompt,
      seed: payload.seed,
      modelId: payload.modelId,
      aspectRatio: payload.aspectRatio,
      kind: payload.kind,
    });

    return {
      state: 'succeeded',
      progress: 100,
      outputs: [output],
      costMicroUsd: computeCostMicroUsd(payload),
    };
  }

  async function cancel(handle: ProviderJobHandle): Promise<void> {
    if (cancelledJobs.has(handle.providerJobId)) return; // idempotent

    const payload = decodeJobId(handle.providerJobId);
    const elapsedMs = elapsedMsSince(handle.submittedAt);
    const timeline = computeTimelineState(elapsedMs, payload.estimatedSeconds, latencyScale);
    cancelledJobs.set(handle.providerJobId, timeline.progress);
  }

  return { id: PROVIDER_ID, submit, poll, cancel };
}
