import { beforeAll, describe, expect, it } from 'vitest';

import type { Clock } from '../../../lib/server/clock';
import type { GenerationRequest, ModelDescriptor } from '../../../lib/server/providers/types';

// lib/server/providers/mock/mockProvider.ts imports lib/server/env.ts, which parses
// process.env at module load and throws if AUTH_SECRET is absent (lib/server/env.ts,
// architecture.md §9). This suite doesn't care about AUTH_SECRET at all — it only needs env.ts
// to finish loading — so, same pattern as tests/shared/server-env.test.ts, the module is
// imported dynamically in beforeAll after ensuring the var is set, rather than statically at the
// top of the file (a static `import` is hoisted and evaluated before any of this file's own
// code, so setting process.env here would be too late for it).
let createMockProvider: typeof import('../../../lib/server/providers/mock/mockProvider').createMockProvider;

beforeAll(async () => {
  process.env.AUTH_SECRET ??= 'test-secret-for-provider-tests';
  ({ createMockProvider } = await import('../../../lib/server/providers/mock/mockProvider'));
});

/**
 * A movable test clock — `lib/server/clock.ts` only ships `systemClock` (real time) and
 * `fixedClock` (a single frozen instant), and it is out of scope for this task to modify. The
 * mock provider's whole design point is "fully drivable by moving an injected Clock"
 * (architecture.md §5.1), so tests need a clock that can actually move; this satisfies the same
 * `Clock` interface (`{ now(): Date }`) without touching lib/server/clock.ts.
 */
function createMovableClock(startIso: string): { clock: Clock; advanceMs: (ms: number) => void } {
  let current = new Date(startIso).getTime();
  return {
    clock: { now: () => new Date(current) },
    advanceMs: (ms: number) => {
      current += ms;
    },
  };
}

const IMAGE_MODEL: ModelDescriptor = {
  id: 'nano-banana-2',
  providerId: 'mock',
  upstreamModel: 'nano-banana/v2.1-image',
  displayName: 'Nano Banana 2',
  kind: 'image',
  tier: 'premium',
  badges: ['latest'],
  aspectRatios: ['1:1', '16:9'],
  estimatedSeconds: 10,
  previewAssetPath: '/brand/models/nano-banana-2.svg',
  available: true,
};

const VIDEO_MODEL: ModelDescriptor = {
  id: 'kling-2-5',
  providerId: 'mock',
  upstreamModel: 'kling/v2.5-pro-video',
  displayName: 'Kling 2.5',
  kind: 'video',
  tier: 'premium',
  badges: ['latest'],
  aspectRatios: ['16:9', '9:16'],
  maxDurationSeconds: 5,
  estimatedSeconds: 14,
  previewAssetPath: '/brand/models/kling-2-5.svg',
  available: true,
};

function makeRequest(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    requestId: 'gen_test0000000000000',
    model: IMAGE_MODEL,
    kind: 'image',
    mode: 'create',
    prompt: 'a chrome fox in the rain',
    params: { aspectRatio: '1:1', seed: 12345 },
    ...overrides,
  };
}

describe('mock provider — full state walk (queued -> running -> succeeded)', () => {
  it('advances lazily from a frozen clock, monotonic progress, 100 only at completion', async () => {
    const { clock, advanceMs } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 1, failureRate: 0 });

    const handle = await provider.submit(makeRequest());
    expect(handle.providerId).toBe('mock');
    expect(handle.submittedAt).toBe('2026-08-12T00:00:00.000Z');

    // estimatedSeconds = 10 -> queuedMs = max(300, 800) = 800; runningMs = 10000; total = 10800.
    const first = await provider.poll(handle);
    expect(first).toEqual({ state: 'queued', progress: 0 });

    advanceMs(500);
    const stillQueued = await provider.poll(handle);
    expect(stillQueued.state).toBe('queued');
    expect(stillQueued.progress).toBe(0);

    let previousProgress = -1;
    advanceMs(400); // now at 900ms elapsed -> running

    for (let i = 0; i < 12; i += 1) {
      const status = await provider.poll(handle);
      if (status.state === 'succeeded') break;
      expect(status.state).toBe('running');
      expect(status.progress).toBeGreaterThanOrEqual(previousProgress);
      expect(status.progress).toBeLessThan(100);
      previousProgress = status.progress;
      advanceMs(900);
    }

    advanceMs(10_000); // push well past totalMs
    const terminal = await provider.poll(handle);
    expect(terminal.state).toBe('succeeded');
    if (terminal.state !== 'succeeded') throw new Error('unreachable');
    expect(terminal.progress).toBe(100);
    expect(terminal.outputs).toHaveLength(1);
    expect(terminal.outputs[0]?.mimeType).toBe('image/svg+xml');
    expect(typeof terminal.costMicroUsd).toBe('number');
    expect(terminal.costMicroUsd).toBeGreaterThan(0);

    // Polling again after terminal stays succeeded, still 100, never regresses.
    const polledAgain = await provider.poll(handle);
    expect(polledAgain.state).toBe('succeeded');
  });

  it('different models with different estimatedSeconds progress at genuinely different rates', async () => {
    const { clock, advanceMs } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 1, failureRate: 0 });

    const fastHandle = await provider.submit(
      makeRequest({ model: { ...IMAGE_MODEL, estimatedSeconds: 2 }, kind: 'image' }),
    );
    const slowHandle = await provider.submit(
      makeRequest({ model: VIDEO_MODEL, kind: 'video', params: { aspectRatio: '16:9', seed: 1 } }),
    );

    advanceMs(2_500); // past the fast model's total (~2.16s), well within the slow model's (~15.1s)

    const fastStatus = await provider.poll(fastHandle);
    const slowStatus = await provider.poll(slowHandle);

    expect(fastStatus.state).toBe('succeeded');
    expect(slowStatus.state).toBe('running');
  });

  it('respects MOCK_LATENCY_SCALE=0 by resolving immediately', async () => {
    const { clock } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 0, failureRate: 0 });

    const handle = await provider.submit(makeRequest());
    const status = await provider.poll(handle);
    expect(status.state).toBe('succeeded');
  });
});

describe('mock provider — deterministic failure injection', () => {
  it('fails with PROVIDER_REJECTED when the prompt matches /\\bfail\\b/i', async () => {
    const { clock, advanceMs } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 0, failureRate: 0 });

    const handle = await provider.submit(makeRequest({ prompt: 'please fail this request' }));
    advanceMs(1);
    const status = await provider.poll(handle);

    expect(status.state).toBe('failed');
    if (status.state !== 'failed') throw new Error('unreachable');
    expect(status.error.code).toBe('PROVIDER_REJECTED');
    expect(typeof status.error.retriable).toBe('boolean');
  });

  it('does not fail a prompt that merely contains "fail" as part of another word', async () => {
    const { clock } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 0, failureRate: 0 });

    const handle = await provider.submit(makeRequest({ prompt: 'a failsafe mechanism glowing blue' }));
    const status = await provider.poll(handle);
    expect(status.state).toBe('succeeded');
  });

  it('fails deterministically when MOCK_FAILURE_RATE=1, regardless of prompt', async () => {
    const { clock } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 0, failureRate: 1 });

    const handle = await provider.submit(makeRequest({ prompt: 'a perfectly ordinary prompt' }));
    const status = await provider.poll(handle);
    expect(status.state).toBe('failed');
  });

  it('never fails when MOCK_FAILURE_RATE=0 and the prompt has no trigger, across many requestIds', async () => {
    const { clock } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 0, failureRate: 0 });

    for (let i = 0; i < 25; i += 1) {
      const handle = await provider.submit(
        makeRequest({ requestId: `gen_test${String(i).padStart(15, '0')}`, prompt: 'a calm blue lattice' }),
      );
      const status = await provider.poll(handle);
      expect(status.state).toBe('succeeded');
    }
  });

  it('is deterministic across repeated polls of the same terminal job', async () => {
    const { clock } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 0, failureRate: 0 });

    const handle = await provider.submit(makeRequest({ prompt: 'please fail here' }));
    const first = await provider.poll(handle);
    const second = await provider.poll(handle);
    expect(first.state).toBe('failed');
    expect(second.state).toBe('failed');
  });
});

describe('mock provider — cancel', () => {
  it('cancel() makes a subsequent poll() return cancelled', async () => {
    const { clock, advanceMs } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 1, failureRate: 0 });

    const handle = await provider.submit(makeRequest());
    advanceMs(1000); // now running

    await provider.cancel(handle);
    const status = await provider.poll(handle);
    expect(status.state).toBe('cancelled');
  });

  it('freezes progress at cancellation time and does not later report succeeded', async () => {
    const { clock, advanceMs } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 1, failureRate: 0 });

    const handle = await provider.submit(makeRequest());
    advanceMs(2000);
    await provider.cancel(handle);

    const rightAfter = await provider.poll(handle);
    advanceMs(50_000); // well past the model's total duration
    const muchLater = await provider.poll(handle);

    expect(rightAfter.state).toBe('cancelled');
    expect(muchLater.state).toBe('cancelled');
    expect(muchLater.progress).toBe(rightAfter.progress);
  });

  it('is idempotent — calling cancel twice does not throw or change the frozen progress', async () => {
    const { clock, advanceMs } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 1, failureRate: 0 });

    const handle = await provider.submit(makeRequest());
    advanceMs(500);
    await provider.cancel(handle);
    const firstProgress = (await provider.poll(handle)).progress;

    advanceMs(500);
    await provider.cancel(handle);
    const secondProgress = (await provider.poll(handle)).progress;

    expect(secondProgress).toBe(firstProgress);
  });
});

describe('mock provider — submit', () => {
  it('never blocks: resolves without needing time to advance', async () => {
    const { clock } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 1, failureRate: 0 });

    const handle = await provider.submit(makeRequest());
    expect(handle.providerJobId.length).toBeGreaterThan(0);
    expect(handle.providerId).toBe('mock');
  });

  it('exercises getProviderCredentials() without leaking the key onto the handle', async () => {
    const { clock } = createMovableClock('2026-08-12T00:00:00.000Z');
    const provider = createMockProvider({ clock, latencyScale: 1, failureRate: 0 });

    const handle = await provider.submit(makeRequest());
    const serialized = JSON.stringify(handle);
    expect(serialized).not.toMatch(/MOCK/);
    expect(serialized).not.toMatch(/ADAMANTITE_PROVIDER_API_KEY/i);
  });
});
