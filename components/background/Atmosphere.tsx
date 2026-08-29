/**
 * The aurora mesh — the app's background. Sits below the rain field (z-0) and the content
 * (z-10), and is the surface every `.glass-*` panel in the app is sampling when it blurs.
 *
 * Six stacked layers, cheapest first:
 *   1. base wash      — a static blue/violet mesh gradient so `--color-ada-bg` never reads flat
 *   2. aurora masses  — three large blurred colour fields on independent slow drifts, composited
 *                       with `mix-blend-screen` so they add light rather than paint over
 *   3. horizon bloom  — a wide, low band of teal light along the bottom edge
 *   4. mesh grid      — a faint perspective-free lattice, masked out towards the edges
 *   5. grain          — a tiled fractal-noise tile at ~3.5% opacity. This is load-bearing, not
 *                       decoration: 8-bit-per-channel gradients this wide and this dark band
 *                       visibly, and a little noise is the standard fix
 *   6. vignette       — pulls the corners back down so text near the viewport edges keeps its
 *                       measured contrast against the ground
 *
 * The aurora's peak brightness is capped, and that cap is a contrast budget, not taste: body
 * copy on `/` and `/pricing` sits directly on this layer, so the brightest ground pixel behind
 * it has to stay at or below ~4% luminance for `--color-ada-text-muted` to hold 4.5:1. Raising
 * any alpha here means re-running the check in `styles/theme.css`'s text ramp.
 *
 * Everything here is `aria-hidden`, `pointer-events-none`, and composited on `transform` /
 * `opacity` only. The drifts are `motion-safe:` — under `prefers-reduced-motion` the aurora is
 * still there, it simply stops moving.
 */

// A single 160x160 fractal-noise tile, inlined so it costs no request. `#` is pre-escaped to
// `%23`; the rest is safe unencoded once the URI is wrapped in quotes (same technique as
// `RainField`'s rain tile).
const GRAIN_TILE =
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter>" +
  "<rect width='160' height='160' filter='url(%23n)' opacity='0.55'/>" +
  '</svg>';

export function Atmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 1 — base mesh wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 85% at 50% -12%, rgb(20 48 106 / 0.72), transparent 62%),' +
            'radial-gradient(85% 62% at 6% 4%, rgb(14 56 114 / 0.52), transparent 66%),' +
            'radial-gradient(82% 64% at 94% 8%, rgb(52 28 104 / 0.5), transparent 66%),' +
            'radial-gradient(115% 72% at 50% 106%, rgb(9 48 74 / 0.52), transparent 64%),' +
            'linear-gradient(180deg, var(--color-ada-bg), var(--color-ada-void))',
        }}
      />

      {/* 2 — the aurora masses. `screen` so overlaps brighten instead of muddying. */}
      <div className="absolute inset-0 mix-blend-screen">
        <div
          className="absolute -left-[15%] -top-[20%] h-[70vmax] w-[70vmax] rounded-full opacity-90 motion-safe:animate-[ada-aurora-a_34s_ease-in-out_infinite]"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-ada-aurora-1) 46%, transparent), transparent 68%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          className="absolute -right-[18%] top-[6%] h-[62vmax] w-[62vmax] rounded-full opacity-85 motion-safe:animate-[ada-aurora-b_44s_ease-in-out_infinite]"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-ada-aurora-3) 42%, transparent), transparent 68%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -bottom-[26%] left-[14%] h-[58vmax] w-[58vmax] rounded-full opacity-75 motion-safe:animate-[ada-aurora-c_52s_ease-in-out_infinite]"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-ada-aurora-2) 36%, transparent), transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
      </div>

      {/* 3 — horizon bloom */}
      <div
        className="absolute inset-x-0 bottom-0 h-[42vh] mix-blend-screen motion-safe:animate-[ada-fog-drift_30s_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 128%, color-mix(in oklab, var(--color-ada-aurora-4) 48%, transparent), transparent 72%)',
          filter: 'blur(40px)',
        }}
      />

      {/* 4 — mesh lattice */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(120 190 255 / 0.13) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgb(120 190 255 / 0.13) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          maskImage: 'radial-gradient(120% 90% at 50% 30%, black 10%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 50% 30%, black 10%, transparent 72%)',
        }}
      />

      {/* 5 — grain. Kills the banding that 60vmax-wide dark gradients produce on 8-bit panels. */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,${GRAIN_TILE}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '160px 160px',
        }}
      />

      {/* 6 — vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(135% 105% at 50% 40%, transparent 55%, rgb(2 3 10 / 0.4) 86%, rgb(2 3 10 / 0.72) 100%)',
        }}
      />
    </div>
  );
}
