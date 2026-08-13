import { describe, expect, it } from 'vitest';

import {
  computeQueuedMs,
  computeRunningMs,
  computeTimelineState,
  easeProgress,
} from '../../../lib/server/providers/mock/timeline';

describe('computeQueuedMs', () => {
  it('is 8% of estimatedSeconds in ms, floored at 300ms', () => {
    expect(computeQueuedMs(5, 1)).toBe(400); // 0.08 * 5000 = 400
    expect(computeQueuedMs(1, 1)).toBe(300); // 0.08 * 1000 = 80 -> floored to 300
  });

  it('scales with latencyScale', () => {
    expect(computeQueuedMs(5, 0)).toBe(0);
    expect(computeQueuedMs(5, 2)).toBe(800);
  });
});

describe('computeRunningMs', () => {
  it('equals estimatedSeconds in ms, scaled by latencyScale', () => {
    expect(computeRunningMs(10, 1)).toBe(10000);
    expect(computeRunningMs(10, 0)).toBe(0);
    expect(computeRunningMs(10, 0.5)).toBe(5000);
  });
});

describe('easeProgress', () => {
  it('is 0 at fraction 0 and 1 at fraction 1', () => {
    expect(easeProgress(0)).toBe(0);
    expect(easeProgress(1)).toBe(1);
  });

  it('is monotonic non-decreasing across [0,1]', () => {
    let previous = -Infinity;
    for (let i = 0; i <= 100; i += 1) {
      const value = easeProgress(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('is non-linear (ease-out: front-loaded relative to a straight line)', () => {
    expect(easeProgress(0.25)).toBeGreaterThan(0.25);
  });

  it('clamps fractions outside [0,1]', () => {
    expect(easeProgress(-1)).toBe(0);
    expect(easeProgress(2)).toBe(1);
  });
});

describe('computeTimelineState', () => {
  const estimatedSeconds = 10;
  const latencyScale = 1;
  // queuedMs = max(300, 0.08*10*1000) = 800; runningMs = 10000; totalMs = 10800.

  it('is queued with progress 0 before queuedMs elapses', () => {
    expect(computeTimelineState(0, estimatedSeconds, latencyScale)).toEqual({
      phase: 'queued',
      progress: 0,
    });
    expect(computeTimelineState(799, estimatedSeconds, latencyScale)).toEqual({
      phase: 'queued',
      progress: 0,
    });
  });

  it('is running with an eased, non-decreasing progress between queuedMs and totalMs', () => {
    const samples = [800, 2000, 4000, 6000, 8000, 10000, 10799];
    let previousProgress = -1;
    for (const elapsedMs of samples) {
      const state = computeTimelineState(elapsedMs, estimatedSeconds, latencyScale);
      expect(state.phase).toBe('running');
      expect(state.progress).toBeGreaterThanOrEqual(previousProgress);
      expect(state.progress).toBeLessThanOrEqual(99);
      previousProgress = state.progress;
    }
  });

  it('never reports progress 100 while running, and never reports running past totalMs', () => {
    const state = computeTimelineState(10799, estimatedSeconds, latencyScale);
    expect(state.phase).toBe('running');
    expect(state.progress).toBeLessThan(100);
  });

  it('is succeeded with progress exactly 100 at and after totalMs', () => {
    expect(computeTimelineState(10800, estimatedSeconds, latencyScale)).toEqual({
      phase: 'succeeded',
      progress: 100,
    });
    expect(computeTimelineState(50000, estimatedSeconds, latencyScale)).toEqual({
      phase: 'succeeded',
      progress: 100,
    });
  });

  it('treats negative elapsed time as zero rather than throwing or going negative', () => {
    expect(computeTimelineState(-500, estimatedSeconds, latencyScale)).toEqual({
      phase: 'queued',
      progress: 0,
    });
  });

  it('walks the full timeline (many small steps) with monotonic non-decreasing progress and 100 only at completion', () => {
    const totalMs = computeQueuedMs(estimatedSeconds, latencyScale) + computeRunningMs(estimatedSeconds, latencyScale);
    let previousProgress = -1;
    let sawHundredBeforeEnd = false;

    for (let elapsedMs = 0; elapsedMs <= totalMs + 500; elapsedMs += 137) {
      const state = computeTimelineState(elapsedMs, estimatedSeconds, latencyScale);
      expect(state.progress).toBeGreaterThanOrEqual(previousProgress);
      if (state.progress === 100 && elapsedMs < totalMs) sawHundredBeforeEnd = true;
      previousProgress = state.progress;
    }

    expect(sawHundredBeforeEnd).toBe(false);
    expect(previousProgress).toBe(100);
  });

  it('scales entirely away when latencyScale is 0 (tests set MOCK_LATENCY_SCALE=0)', () => {
    expect(computeTimelineState(0, estimatedSeconds, 0)).toEqual({
      phase: 'succeeded',
      progress: 100,
    });
  });
});
