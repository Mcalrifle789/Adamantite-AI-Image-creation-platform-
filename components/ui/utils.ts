import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';

/** Thin wrapper around `clsx` so every primitive composes class names the same way. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Corners a `HudFrame` chamfer or bracket accent can occupy — ux-patterns.md §5. */
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export const ALL_CORNERS: readonly Corner[] = ['tl', 'tr', 'bl', 'br'];

/** The corners *not* present in `corners` — used to place `HudBrackets` on the edges the
 * chamfer does not cut (ux-patterns.md §5: "the two corners the chamfer does not cut"). */
export function complementCorners(corners: readonly Corner[]): Corner[] {
  const set = new Set(corners);
  return ALL_CORNERS.filter((corner) => !set.has(corner));
}
