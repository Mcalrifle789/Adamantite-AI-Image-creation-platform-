import type { CSSProperties, ElementType, ReactNode } from 'react';

import { complementCorners, type Corner } from '../ui/utils';
import { HudBrackets } from './HudBrackets';

export type HudTone = 'default' | 'active' | 'danger';
export type HudChamfer = 'md' | 'sm';

export interface HudFrameProps {
  tone?: HudTone;
  chamfer?: HudChamfer;
  brackets?: boolean;
  corners?: Corner[];
  as?: ElementType;
  className?: string;
  /** Applied to the inner (`.hud__inner`) surface, not the 1px border layer — use this instead
   * of padding the outer element, or the chamfer border collapses. */
  innerClassName?: string;
  children?: ReactNode;
}

const DEFAULT_CORNERS: Corner[] = ['tl', 'br'];

/**
 * The chamfered HUD panel — ux-patterns.md §5. `styles/hud.css` supplies the `.hud` /
 * `.hud__inner` classes and the default tl+br clip-path; this component adds tone, an optional
 * `sm` chamfer, an arbitrary `corners` selection (recomputing the clip-path polygon only when it
 * differs from the CSS file's built-in default), and the bracket accents.
 *
 * Two gotchas from ux-patterns.md §5, both load-bearing:
 *  1. `clip-path` clips the browser's own focus ring, so **this component is never the
 *     focusable element**. It renders no `tabIndex`, no `onFocus`, no interactive role. A
 *     focusable child must render its own inset ring — see `HUD_INSET_FOCUS_RING` below.
 *  2. `clip-path` also clips `overflow`, so scrollable content placed inside a `HudFrame` needs
 *     its own nested element with `overflow-y: auto` and its own `border-radius`, inset ~1px
 *     from the chamfer — do not rely on `.hud__inner` itself to scroll.
 */
export function HudFrame({
  tone = 'default',
  chamfer = 'md',
  brackets = false,
  corners = DEFAULT_CORNERS,
  as: Component = 'div',
  className,
  innerClassName,
  children,
}: HudFrameProps) {
  const isDefaultShape = chamfer === 'md' && sameCorners(corners, DEFAULT_CORNERS);

  const style: CSSProperties = {};
  if (chamfer === 'sm') {
    (style as Record<string, string>)['--chamfer'] = 'var(--chamfer-sm)';
  }
  if (!isDefaultShape) {
    style.clipPath = buildChamferClipPath(corners, 'var(--chamfer)');
  }

  return (
    <Component className={cx('hud', className)} data-tone={tone} style={style}>
      <div className={cx('hud__inner', innerClassName)} style={!isDefaultShape ? { clipPath: style.clipPath } : undefined}>
        {children}
      </div>
      {brackets ? <HudBrackets corners={complementCorners(corners)} /> : null}
    </Component>
  );
}

/** Tailwind class consumers apply to the focusable child of a `HudFrame` — the inset ring the
 * clip-path would otherwise swallow (gotcha 1 above). */
export const HUD_INSET_FOCUS_RING =
  'focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--color-ada-cyan-300)]';

function sameCorners(a: Corner[], b: Corner[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((corner) => setB.has(corner));
}

function buildChamferClipPath(corners: Corner[], chamfer: string): string {
  const has = (corner: Corner) => corners.includes(corner);
  const points: string[] = [];

  points.push(has('tl') ? `${chamfer} 0` : '0 0');
  points.push(has('tr') ? `calc(100% - ${chamfer}) 0` : '100% 0');
  if (has('tr')) points.push(`100% ${chamfer}`);
  points.push(has('br') ? `100% calc(100% - ${chamfer})` : '100% 100%');
  if (has('br')) points.push(`calc(100% - ${chamfer}) 100%`);
  points.push(has('bl') ? `${chamfer} 100%` : '0 100%');
  if (has('bl')) points.push(`0 calc(100% - ${chamfer})`);
  if (has('tl')) points.push(`0 ${chamfer}`);

  return `polygon(${points.join(', ')})`;
}

function cx(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}
