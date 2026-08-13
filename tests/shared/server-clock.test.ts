import { describe, expect, it } from 'vitest';

import { fixedClock, systemClock } from '../../lib/server/clock';

describe('systemClock', () => {
  it('returns the current time', () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

describe('fixedClock', () => {
  it('always returns the same instant', () => {
    const clock = fixedClock('2026-08-12T00:00:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-08-12T00:00:00.000Z');
    expect(clock.now().toISOString()).toBe(clock.now().toISOString());
  });

  it('returns a fresh Date instance each call, not a shared mutable reference', () => {
    const clock = fixedClock('2026-08-12T00:00:00.000Z');
    const first = clock.now();
    first.setFullYear(1999);
    expect(clock.now().getFullYear()).toBe(2026);
  });

  it('throws on an invalid ISO string', () => {
    expect(() => fixedClock('not-a-date')).toThrow();
  });
});
