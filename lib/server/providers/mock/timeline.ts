import 'server-only';

/**
 * The mock's lazy-advance timeline — architecture.md §5.1. Job state is a pure function of
 * elapsed time against a scripted timeline derived from the model's own `estimatedSeconds`, so a
 * 2s `flux-schnell` and an 18s `veo-3-1` progress at genuinely different rates and the progress
 * UI is exercised across the real range. No timers: the caller (`mock/mockProvider.ts`) recomputes
 * this on every call from `clock.now() − submittedAt` — polling *is* the advance mechanism.
 */

export type TimelinePhase = 'queued' | 'running' | 'succeeded';

export interface TimelineState {
  phase: TimelinePhase;
  /** 0..100. Always 0 while queued, always 100 once succeeded, eased in between — and capped at
   * 99 while running so a job is never reported "done" a poll before it actually is. */
  progress: number;
}

/** `queuedMs = max(300, 0.08 × estimatedSeconds × 1000)`, scaled by `latencyScale`. */
export function computeQueuedMs(estimatedSeconds: number, latencyScale: number): number {
  return Math.max(300, 0.08 * estimatedSeconds * 1000) * latencyScale;
}

/** The running phase spans the model's own `estimatedSeconds`, scaled by `latencyScale`. */
export function computeRunningMs(estimatedSeconds: number, latencyScale: number): number {
  return estimatedSeconds * 1000 * latencyScale;
}

/** Ease-out cubic: starts fast, settles into completion — explicitly non-linear
 * (architecture.md §5.1). Monotonic non-decreasing on `[0,1]`. */
export function easeProgress(fraction: number): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  return 1 - (1 - clamped) ** 3;
}

/**
 * Pure function of elapsed time: where is this job right now? `elapsedMs` is expected to be
 * non-negative (callers clamp `clock.now() − submittedAt` at 0 — clocks never run backwards in
 * this codebase, but a caller composing timestamps from elsewhere should not crash on it).
 */
export function computeTimelineState(
  elapsedMs: number,
  estimatedSeconds: number,
  latencyScale: number,
): TimelineState {
  const safeElapsedMs = Math.max(0, elapsedMs);
  const queuedMs = computeQueuedMs(estimatedSeconds, latencyScale);
  const runningMs = computeRunningMs(estimatedSeconds, latencyScale);
  const totalMs = queuedMs + runningMs;

  if (safeElapsedMs < queuedMs) {
    return { phase: 'queued', progress: 0 };
  }

  if (safeElapsedMs < totalMs) {
    const runningElapsedMs = safeElapsedMs - queuedMs;
    const fraction = runningMs <= 0 ? 1 : runningElapsedMs / runningMs;
    const progress = Math.min(99, Math.floor(easeProgress(fraction) * 100));
    return { phase: 'running', progress };
  }

  return { phase: 'succeeded', progress: 100 };
}
