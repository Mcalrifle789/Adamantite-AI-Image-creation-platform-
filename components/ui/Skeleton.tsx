import { cn } from './utils';

// A mosaic of 6-10px squares, matching ux-patterns.md §12.1 exactly: "NOT a sweeping shimmer
// gradient". Hex values are `--color-ada-blue-400` / `--color-ada-cyan-400` from styles/theme.css
// — data-URI backgrounds render in their own document context and cannot read the host page's
// CSS custom properties, so the token values are inlined here rather than referenced live.
const SKELETON_TILE_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'>" +
  "<rect x='2' y='3' width='7' height='7' fill='%234FA8FF'/>" +
  "<rect x='15' y='11' width='9' height='9' fill='%2322D3EE'/>" +
  "<rect x='24' y='1' width='6' height='6' fill='%234FA8FF'/>" +
  "<rect x='5' y='19' width='8' height='8' fill='%2322D3EE'/>" +
  "<rect x='20' y='22' width='7' height='7' fill='%234FA8FF'/>" +
  '</svg>';

const SKELETON_BACKGROUND_IMAGE = `url("data:image/svg+xml,${SKELETON_TILE_SVG}")`;

export interface SkeletonProps {
  className?: string;
  /** Must match the real content's box exactly so arrival causes zero layout shift
   * (ux-patterns.md §12.1: "CLS 0"). */
  style?: React.CSSProperties;
  'aria-label'?: string;
}

/** Loading placeholder — mosaic breathing between 4% and 9% opacity on a 1.6s ease-in-out loop.
 * Rejected by name in ux-patterns.md §12.1: a sweeping shimmer gradient repaints a large area
 * every frame and reads as a cliché. Static at 0.06 under `prefers-reduced-motion` (see the
 * `.ada-skeleton` rule in app/globals.css). */
export function Skeleton({ className, style, 'aria-label': ariaLabel = 'Loading' }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn('ada-skeleton rounded-md', className)}
      style={{
        backgroundImage: SKELETON_BACKGROUND_IMAGE,
        backgroundRepeat: 'repeat',
        animation: 'ada-skeleton-breathe 1.6s ease-in-out infinite',
        ...style,
      }}
    />
  );
}
