import { RainCanvasLoader } from './RainCanvasLoader';
import type { RainDensity } from './RainCanvas';

export interface RainFieldProps {
  /** `full` on `/` and `/pricing`, `quiet` on `/workspace` — ux-patterns.md §7.2. */
  density?: RainDensity;
}

const TILE_SIZE = 240;

// Layer A — ux-patterns.md §7.1: a tiled 240x240 SVG data-URI of scattered 2-4px squares and 1px
// vertical streaks at 6-14% alpha. Hex values mirror `--color-ada-blue-500` (#1E90FF) and
// `--color-ada-cyan-400` (#22D3EE) from styles/theme.css — an inlined data-URI background image
// renders in its own document context and cannot read the host page's custom properties, so the
// token values are duplicated here rather than referenced live (same technique as
// `components/ui/Skeleton.tsx`). `#` is pre-escaped to `%23`; the rest is left unencoded, which
// is safe once the URI itself is wrapped in quotes.
const RAIN_TILE_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>" +
  "<rect x='14' y='22' width='3' height='3' fill='%231E90FF' fill-opacity='0.12'/>" +
  "<rect x='52' y='68' width='2' height='2' fill='%2322D3EE' fill-opacity='0.10'/>" +
  "<rect x='96' y='14' width='4' height='4' fill='%231E90FF' fill-opacity='0.08'/>" +
  "<rect x='138' y='96' width='3' height='3' fill='%2322D3EE' fill-opacity='0.13'/>" +
  "<rect x='176' y='40' width='2' height='2' fill='%231E90FF' fill-opacity='0.09'/>" +
  "<rect x='206' y='150' width='3' height='3' fill='%2322D3EE' fill-opacity='0.11'/>" +
  "<rect x='30' y='176' width='4' height='4' fill='%231E90FF' fill-opacity='0.07'/>" +
  "<rect x='88' y='204' width='2' height='2' fill='%2322D3EE' fill-opacity='0.14'/>" +
  "<rect x='150' y='214' width='3' height='3' fill='%231E90FF' fill-opacity='0.10'/>" +
  "<rect x='220' y='60' width='2' height='2' fill='%2322D3EE' fill-opacity='0.08'/>" +
  "<rect x='6' y='120' width='3' height='3' fill='%231E90FF' fill-opacity='0.11'/>" +
  "<rect x='60' y='4' width='1' height='58' fill='%2322D3EE' fill-opacity='0.08'/>" +
  "<rect x='118' y='140' width='1' height='72' fill='%231E90FF' fill-opacity='0.07'/>" +
  "<rect x='190' y='6' width='1' height='96' fill='%2322D3EE' fill-opacity='0.09'/>" +
  "<rect x='232' y='180' width='1' height='50' fill='%231E90FF' fill-opacity='0.06'/>" +
  '</svg>';

const RAIN_TILE_BACKGROUND = `url("data:image/svg+xml,${RAIN_TILE_SVG}")`;

/**
 * `<RainField />` — ux-patterns.md §7, ADR-05. Server Component: Layer A renders immediately on
 * the server (zero JS, one background-image), so there is never a flash of empty background.
 * Layer B (the animated canvas) is a client-only island loaded via `RainCanvasLoader`.
 */
export function RainField({ density = 'full' }: RainFieldProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'var(--color-ada-bg)',
          backgroundImage: RAIN_TILE_BACKGROUND,
          backgroundRepeat: 'repeat',
          backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
        }}
      />
      {/* The vignette that keeps the effective ground within 0.5% luminance of --color-ada-bg
       * under any text (ux-patterns.md §3.4) — this CAN use the live custom property since it's
       * a normal inline style, not embedded in a data URI. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(120% 80% at 50% 0%, transparent 0%, var(--color-ada-bg) 78%)',
        }}
      />
      <RainCanvasLoader density={density} />
    </div>
  );
}
