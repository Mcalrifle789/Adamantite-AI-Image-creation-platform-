import 'server-only';

/**
 * The one time source for the whole server. Nothing else in the codebase reads the wall clock
 * directly (architecture.md §3.1 "Testability rule") — services take a `Clock` as a constructor
 * input, so tests can inject {@link fixedClock} and get deterministic behaviour instead of
 * racing real time.
 */
export interface Clock {
  now(): Date;
}

/** The real clock. Used by the app at runtime; never imported by a test. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/**
 * A clock frozen at a specific instant, for tests. Always returns a fresh `Date` instance (never
 * a shared mutable reference) so a caller mutating the returned `Date` cannot corrupt the clock.
 */
export function fixedClock(iso: string): Clock {
  const instant = new Date(iso);

  if (Number.isNaN(instant.getTime())) {
    throw new Error(`fixedClock: invalid ISO timestamp "${iso}"`);
  }

  const millis = instant.getTime();

  return {
    now: () => new Date(millis),
  };
}
