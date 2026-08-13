'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface RainGateResult {
  allowed: boolean;
  reason?: string;
}

export const RAIN_SESSION_KEY = 'ada.rain';

const FRAME_MEAN_SAMPLE = 60;
const FRAME_MEAN_THRESHOLD_MS = 6;

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** All the mandatory gates from ux-patterns.md §7.3 — Layer B does not mount if any hold. */
export function checkRainGates(): RainGateResult {
  if (typeof window === 'undefined') return { allowed: false, reason: 'ssr' };
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return { allowed: false, reason: 'reduced-motion' };
  }

  const nav = window.navigator as NavigatorWithHints;
  if ((nav.hardwareConcurrency ?? Number.POSITIVE_INFINITY) <= 4) {
    return { allowed: false, reason: 'hardware-concurrency' };
  }
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) {
    return { allowed: false, reason: 'device-memory' };
  }
  if (nav.connection?.saveData) {
    return { allowed: false, reason: 'save-data' };
  }

  try {
    if (window.sessionStorage.getItem(RAIN_SESSION_KEY) === 'off') {
      return { allowed: false, reason: 'previously-degraded' };
    }
  } catch {
    // sessionStorage unavailable (private browsing) — do not block on it.
  }

  return { allowed: true };
}

/** `clamp(round(viewportWidth / 28), 24, 64)` — ux-patterns.md §7.2. */
export function columnCountForWidth(viewportWidth: number): number {
  return Math.min(64, Math.max(24, Math.round(viewportWidth / 28)));
}

/**
 * The self-degradation ladder — ux-patterns.md §7.4 / ADR-05. Keeps a rolling mean of the last
 * 60 frame durations; mean > 6ms halves the column count once, a second breach unmounts the
 * canvas permanently for the session (`sessionStorage['ada.rain'] = 'off'`).
 */
export function useRainBudget(initialColumns: number) {
  const [columns, setColumns] = useState(initialColumns);
  const [unmounted, setUnmounted] = useState(false);
  const samplesRef = useRef<number[]>([]);
  const halvedRef = useRef(false);
  const meanRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setColumns(initialColumns), 0);
    return () => window.clearTimeout(timeout);
  }, [initialColumns]);

  const recordFrame = useCallback((durationMs: number) => {
    const samples = samplesRef.current;
    samples.push(durationMs);
    if (samples.length < FRAME_MEAN_SAMPLE) return;

    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    meanRef.current = mean;
    samplesRef.current = [];

    if (mean <= FRAME_MEAN_THRESHOLD_MS) return;

    if (!halvedRef.current) {
      halvedRef.current = true;
      setColumns((current) => Math.max(4, Math.round(current / 2)));
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[ada.rain] mean frame time ${mean.toFixed(2)}ms — halving columns`);
      }
      return;
    }

    setUnmounted(true);
    try {
      window.sessionStorage.setItem(RAIN_SESSION_KEY, 'off');
    } catch {
      // ignore — worst case it re-evaluates next navigation.
    }
  }, []);

  return { columns, recordFrame, unmounted, getMeanFrameMs: () => meanRef.current };
}
