import type { Metadata } from 'next';
import { Space_Grotesk, Spectral, Spline_Sans, Spline_Sans_Mono } from 'next/font/google';

import { Atmosphere } from '@/components/background/Atmosphere';
import { RainField } from '@/components/background/RainField';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastRegion } from '@/components/ui/Toast';

import './globals.css';

/**
 * The type system — four families, four jobs. `next/font/google` self-hosts each one at build
 * time, so there is no request to fonts.googleapis.com at runtime and no third-party origin in
 * the critical path.
 *
 * Every family loads `latin-ext` as well as `latin`. That is the honest version of "Arial CE":
 * CE is a pre-Unicode codepage variant of Arial, not a family that still exists to load, so the
 * way to actually get Central European coverage is the `latin-ext` subset on the real webfonts.
 *
 * `display: 'swap'` throughout — fallback text paints immediately and is replaced when the face
 * arrives, rather than the page holding a blank space (FOIT).
 */

/** Display — the wordmark, hero headings, plan names. Geometric grotesque with enough quirk
 * (the single-storey `a`, the flat terminals) to read as engineered rather than corporate. */
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

/** UI — every control, label, nav item, and short string in the interface. */
const splineSans = Spline_Sans({
  variable: '--font-spline-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

/** Numeric and technical — credit balances, aspect ratios, badges, file sizes, status readouts.
 * Shares Spline Sans's skeleton, so figures sit next to UI text as the same voice rather than a
 * borrowed one. */
const splineSansMono = Spline_Sans_Mono({
  variable: '--font-spline-sans-mono',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

/** Editorial — marketing prose and anything longer than a line. Spectral is drawn for screen
 * reading, and the serif gives the "luxury studio" copy warmth the grotesques cannot. Static
 * weights, not variable, so the axes are declared explicitly. */
const spectral = Spectral({
  variable: '--font-spectral',
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Adamantite Agent',
  description: 'AI image and short-video generation.',
};

/**
 * The app shell — architecture.md §7 / ux-patterns.md §9. Mounts the font variables, the token
 * stylesheets (via `globals.css`), `RainField` fixed at `z-0`, the TanStack Query provider, and
 * the toast region. Nothing else is global: the `<header>`/`<main>` landmarks belong to each
 * route's own page (T-007/T-008/T-009) — this file intentionally does not add a second `<main>`
 * or a generic wrapper landmark of its own, only a non-landmark `z-10` stacking context so route
 * content always paints above the rain field.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${splineSans.variable} ${splineSansMono.variable} ${spectral.variable}`}
    >
      <body>
        <Atmosphere />
        <RainField />
        <QueryProvider>
          <div className="relative z-10">{children}</div>
          <ToastRegion />
        </QueryProvider>
      </body>
    </html>
  );
}
