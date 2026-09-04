import Image from 'next/image';

/**
 * The hero title as the revisioned logo art (`public/brand/adamantite-lockup.webp`):
 * the neon "Adamantite Agent" lockup with the digital-rain hand, luminance-keyed so
 * the original black field is gone and the art sits directly on the aurora.
 *
 * Blending, in three layers:
 * 1. The asset itself is pre-masked (see `scripts/build_brand_lockup.py`) — alpha is a
 *    luminance key, so only emitted light survives.
 * 2. A radial CSS mask fades the crop edges so the falling rain dissolves into the page
 *    instead of ending in a visible rectangle.
 * 3. A cyan `drop-shadow` glow (`.ada-logo-hero` in `app/globals.css`) reconnects the art
 *    to the site's neon language. A slow glow "breathe" runs under `motion-safe` only.
 *
 * The page owns the accessible name (`<h1 className="sr-only">Adamantite Agent</h1>` in
 * `app/page.tsx`), so the image is decorative here. The typographic `Wordmark` stays in
 * the header and auth pages — at 24px a raster lockup turns to mush.
 */
export function LogoHero({ priority = true }: { priority?: boolean }) {
  return (
    <span className="ada-logo-hero" aria-hidden="true">
      <Image
        src="/brand/adamantite-lockup.webp"
        alt=""
        width={1600}
        height={581}
        priority={priority}
        draggable={false}
        // Hero renders up to ~52rem wide; the file is a 1600px 2x asset.
        sizes="(max-width: 640px) 92vw, 832px"
      />
    </span>
  );
}
