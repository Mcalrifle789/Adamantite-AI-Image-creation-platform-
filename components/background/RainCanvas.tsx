'use client';

import { useEffect, useRef, useState } from 'react';

import { checkRainGates, columnCountForWidth, useRainBudget } from './useRainBudget';

export type RainDensity = 'full' | 'quiet';

export interface RainCanvasProps {
  density?: RainDensity;
}

// Hardcoded to match `--color-ada-blue-500` / `--color-ada-cyan-400` in styles/theme.css — a
// canvas 2D context cannot resolve CSS custom properties, so these mirror the token values
// rather than inventing new ones.
const BLUE_500 = '30 144 255';
const CYAN_400 = '34 211 238';

const MAX_FPS = 60;
const FRAME_BUDGET_MS = 1000 / MAX_FPS;
const MAX_SQUARES_PER_COLUMN = 16;
const TRAIL_FILL = 'rgb(5 5 10 / 0.16)';
const BACKING_SCALE_CAP = 1.5;

interface Square {
  y: number;
  size: number;
  speed: number;
  alpha: number;
  color: string;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeSquare(canvasHeight: number, alphaScale: number, spawnAtTop: boolean): Square {
  const color = Math.random() > 0.5 ? BLUE_500 : CYAN_400;
  return {
    y: spawnAtTop ? randomBetween(-canvasHeight, 0) : -randomBetween(4, 40),
    size: randomBetween(1.5, 4),
    speed: randomBetween(40, 112),
    alpha: randomBetween(0.12, 0.5) * alphaScale,
    color,
  };
}

/**
 * Layer B — the animated canvas, ux-patterns.md §7.1-§7.4. Mounts only past `checkRainGates()`;
 * pauses on `document.visibilityState === 'hidden'`; self-degrades and can unmount permanently
 * for the session. jsdom (used by the test suite) has no 2D canvas context, so the "no 2D
 * context" gate below is what makes this component a safe no-op under `vitest`.
 */
export default function RainCanvas({ density = 'full' }: RainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [gateReason, setGateReason] = useState<string | undefined>();
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const gate = checkRainGates();
    if (!gate.allowed) {
      window.setTimeout(() => setGateReason(gate.reason), 0);
      return;
    }
    window.setTimeout(() => {
      setViewportWidth(window.innerWidth);
      setMounted(true);
    }, 0);

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isQuiet = density === 'quiet';
  const baseColumns = columnCountForWidth(viewportWidth || 1280);
  const targetColumns = isQuiet ? Math.max(4, Math.round(baseColumns * 0.4)) : baseColumns;
  const alphaScale = isQuiet ? 0.6 : 1;

  const { columns, recordFrame, unmounted, getMeanFrameMs } = useRainBudget(targetColumns);

  useEffect(() => {
    if (!mounted || unmounted) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined; // "no 2D context" gate — also what makes this a no-op in jsdom.

    let animationFrame = 0;
    let lastDrawTime = 0;
    let disposed = false;
    let paused = document.visibilityState === 'hidden';

    const scale = Math.min(window.devicePixelRatio || 1, BACKING_SCALE_CAP);
    let width = canvas.clientWidth || window.innerWidth;
    let height = canvas.clientHeight || window.innerHeight;

    function resizeBackingStore() {
      width = canvas!.clientWidth || window.innerWidth;
      height = canvas!.clientHeight || window.innerHeight;
      canvas!.width = Math.max(1, Math.round(width * scale));
      canvas!.height = Math.max(1, Math.round(height * scale));
      ctx!.setTransform(scale, 0, 0, scale, 0, 0);
    }
    resizeBackingStore();
    window.addEventListener('resize', resizeBackingStore);

    const columnWidth = width / columns;
    const columnState: Square[][] = Array.from({ length: columns }, () =>
      Array.from({ length: Math.min(MAX_SQUARES_PER_COLUMN, 4) }, () => makeSquare(height, alphaScale, true)),
    );

    function handleVisibility() {
      paused = document.visibilityState === 'hidden';
      if (!paused) lastDrawTime = 0; // resume with an immediate draw
    }
    document.addEventListener('visibilitychange', handleVisibility);

    function draw(now: number) {
      if (disposed) return;
      animationFrame = window.requestAnimationFrame(draw);
      if (paused) return;

      const elapsed = now - lastDrawTime;
      if (lastDrawTime !== 0 && elapsed < FRAME_BUDGET_MS) return;
      const frameStart = performance.now();

      const dtSeconds = lastDrawTime === 0 ? 1 / MAX_FPS : elapsed / 1000;
      lastDrawTime = now;

      ctx!.fillStyle = TRAIL_FILL;
      ctx!.fillRect(0, 0, width, height);

      for (let columnIndex = 0; columnIndex < columnState.length; columnIndex += 1) {
        const squares = columnState[columnIndex];
        if (!squares) continue;
        const x = columnIndex * columnWidth + columnWidth / 2;

        for (let squareIndex = 0; squareIndex < squares.length; squareIndex += 1) {
          const square = squares[squareIndex];
          if (!square) continue;
          square.y += square.speed * dtSeconds;
          if (square.y > height + square.size) {
            squares[squareIndex] = makeSquare(height, alphaScale, false);
            continue;
          }
          ctx!.fillStyle = `rgb(${square.color} / ${square.alpha})`;
          ctx!.fillRect(x - square.size / 2, square.y, square.size, square.size);
        }

        if (squares.length < MAX_SQUARES_PER_COLUMN && Math.random() < 0.02) {
          squares.push(makeSquare(height, alphaScale, false));
        }
      }

      recordFrame(performance.now() - frameStart);
    }

    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resizeBackingStore);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [mounted, unmounted, columns, alphaScale, recordFrame]);

  const showDevOverlay =
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('rainstats') === '1';

  if (!mounted || unmounted) {
    return showDevOverlay ? (
      <RainStatsOverlay columns={columns} meanFrameMs={0} reason={unmounted ? 'degraded' : gateReason} />
    ) : null;
  }

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-0 h-full w-full" />
      {showDevOverlay ? <RainStatsOverlay columns={columns} meanFrameMs={getMeanFrameMs()} /> : null}
    </>
  );
}

function RainStatsOverlay({
  columns,
  meanFrameMs,
  reason,
}: {
  columns: number;
  meanFrameMs: number;
  reason?: string;
}) {
  return (
    <div className="fixed bottom-2 left-2 z-[999] rounded-md border border-[color:var(--color-ada-line)] bg-ada-surface-2 px-2 py-1 font-mono text-2xs text-ada-text-muted">
      rain: cols={columns} mean={meanFrameMs.toFixed(2)}ms{reason ? ` gate=${reason}` : ''}
    </div>
  );
}
