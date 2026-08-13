'use client';

import dynamic from 'next/dynamic';

import type { RainDensity } from './RainCanvas';

// `next/dynamic(..., { ssr: false })` may only be called from inside a Client Component file —
// this wrapper exists so `RainField` (a Server Component, ux-patterns.md §7.3: "SSR — the
// canvas is a client component with `ssr: false`") can still mount it without itself becoming a
// client boundary. Layer A (the static tile) is what's actually visible during the gap, so
// there is no flash either way.
const RainCanvas = dynamic(() => import('./RainCanvas'), { ssr: false });

export function RainCanvasLoader({ density }: { density?: RainDensity }) {
  return <RainCanvas density={density} />;
}
