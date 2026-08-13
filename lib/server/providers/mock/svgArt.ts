import 'server-only';

import type { MediaKind, ProviderOutput } from '../types';

/**
 * Deterministic SVG synthesis — architecture.md §5.1. This is the mock's entire visible output
 * in M1 (ADR-02): a field of blue/cyan squares and vertical streaks in the Adamantite identity
 * (near-black ground, chamfered HUD geometry, bracket accents), seeded from
 * `hash(prompt + seed + modelId + aspectRatio + kind)` so identical inputs render byte-identical
 * pixels and different prompts render visibly different compositions (varying square/streak
 * layout, density, and the focal glow's position). `kind: 'video'` adds a CSS `@keyframes` loop
 * — still `image/svg+xml`, so `MediaSurface`'s `video/*` branch stays the one exercised only once
 * a real provider lands — but the animation genuinely runs when the SVG is loaded via `<img>`.
 */

export interface SvgArtParams {
  prompt: string;
  seed: number;
  modelId: string;
  aspectRatio: string;
  kind: MediaKind;
}

const PALETTE = ['#8CC4FF', '#4FA8FF', '#1E90FF', '#7CE3FF', '#22D3EE', '#06AECD'] as const;
const ACCENT_PALETTE = ['#7CE3FF', '#22D3EE', '#06AECD'] as const;
const BG_BASE = '#05070D';
const BG_VOID = '#000208';
const BRACKET_COLOR = '#7CE3FF';
const FRAME_COLOR = '#1E90FF';
const VIDEO_DURATION_SECONDS = 5;

const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 },
};

function resolveDimensions(aspectRatio: string): { width: number; height: number } {
  const known = ASPECT_RATIO_DIMENSIONS[aspectRatio];
  if (known) return known;

  const match = /^(\d{1,2}):(\d{1,2})$/.exec(aspectRatio);
  const w = match?.[1] ? Number(match[1]) : NaN;
  const h = match?.[2] ? Number(match[2]) : NaN;
  if (!w || !h) return ASPECT_RATIO_DIMENSIONS['1:1']!;

  const maxEdge = 1024;
  if (w >= h) {
    const width = maxEdge;
    const height = Math.max(64, Math.round((maxEdge * h) / w / 4) * 4);
    return { width, height };
  }
  const height = maxEdge;
  const width = Math.max(64, Math.round((maxEdge * w) / h / 4) * 4);
  return { width, height };
}

/** FNV-1a 32-bit — small, dependency-free, deterministic. Also used by the mock's failure-rate
 * hashing (architecture.md §5.1: "`MOCK_FAILURE_RATE` fires against a hash of `requestId`"). */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — a small, deterministic PRNG seeded from {@link hashString}. */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  const first = values[0]!;
  const index = Math.floor(rng() * values.length);
  return values[index] ?? first;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function synthesizeArt(params: SvgArtParams): ProviderOutput {
  const { prompt, seed, modelId, aspectRatio, kind } = params;
  const { width, height } = resolveDimensions(aspectRatio);
  const isVideo = kind === 'video';

  const rng = createRng(hashString(`${prompt}::${seed}::${modelId}::${aspectRatio}::${kind}`));

  const focalX = round(rng() * width);
  const focalY = round(rng() * height);
  const focalXPct = round((focalX / width) * 100);
  const focalYPct = round((focalY / height) * 100);
  const diagonal = Math.hypot(width, height);

  const squareCount = clamp(Math.round((width * height) / 11000), 36, 70);
  const streakCount = clamp(Math.round(Math.max(width, height) / 70), 7, 14);

  const squares: string[] = [];
  for (let i = 0; i < squareCount; i += 1) {
    const x = round(rng() * width);
    const y = round(rng() * height);
    const size = round(2 + rng() * 7);
    const color = pick(rng, PALETTE);
    const distance = Math.hypot(x - focalX, y - focalY) / diagonal;
    const opacity = clamp(round(0.5 - distance * 0.42 + rng() * 0.14, 2), 0.05, 0.62);
    squares.push(
      `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}" opacity="${opacity}"/>`,
    );
  }

  const streaks: string[] = [];
  for (let i = 0; i < streakCount; i += 1) {
    const x = round(rng() * width);
    const streakHeight = round(height * (0.14 + rng() * 0.56));
    const y = round(rng() * Math.max(0, height - streakHeight));
    const color = pick(rng, ACCENT_PALETTE);
    const opacity = round(0.1 + rng() * 0.26, 2);
    const streakClass = isVideo ? ' class="ada-streak"' : '';
    streaks.push(
      `<rect${streakClass} x="${x}" y="${y}" width="1.4" height="${streakHeight}" fill="${color}" opacity="${opacity}"/>`,
    );
  }

  const chamfer = round(Math.min(width, height) * 0.045);
  const framePath =
    `M ${chamfer} 1 L ${width - 1} 1 L ${width - 1} ${round(height - chamfer)} ` +
    `L ${round(width - chamfer)} ${height - 1} L 1 ${height - 1} L 1 ${chamfer} Z`;

  const bracketLen = round(Math.min(width, height) * 0.07);
  const brackets =
    `<path d="M ${round(width - bracketLen)} 10 L ${width - 10} 10 L ${width - 10} ${bracketLen}" ` +
    `stroke="${BRACKET_COLOR}" stroke-width="2" fill="none" opacity="0.6"/>` +
    `<path d="M 10 ${round(height - bracketLen)} L 10 ${height - 10} L ${bracketLen} ${height - 10}" ` +
    `stroke="${BRACKET_COLOR}" stroke-width="2" fill="none" opacity="0.6"/>`;

  const style = isVideo
    ? '<style>@keyframes ada-drift{0%{transform:translateY(-6%)}50%{transform:translateY(6%)}' +
      '100%{transform:translateY(-6%)}}.ada-streak{animation:ada-drift 5s linear infinite}' +
      '@keyframes ada-pulse{0%,100%{opacity:.55}50%{opacity:1}}' +
      '.ada-focal{animation:ada-pulse 5s ease-in-out infinite}</style>'
    : '';
  const focalClass = isVideo ? ' class="ada-focal"' : '';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    style +
    `<defs><radialGradient id="g" cx="${focalXPct}%" cy="${focalYPct}%" r="72%">` +
    `<stop offset="0%" stop-color="#0B2C63" stop-opacity="0.55"/>` +
    `<stop offset="100%" stop-color="${BG_VOID}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="${BG_BASE}"/>` +
    `<rect${focalClass} width="${width}" height="${height}" fill="url(#g)"/>` +
    streaks.join('') +
    squares.join('') +
    `<path d="${framePath}" fill="none" stroke="${FRAME_COLOR}" stroke-width="1.5" opacity="0.35"/>` +
    brackets +
    `</svg>`;

  const bytes = new TextEncoder().encode(svg);

  return {
    mimeType: 'image/svg+xml',
    bytes,
    width,
    height,
    ...(isVideo ? { durationSeconds: VIDEO_DURATION_SECONDS } : {}),
  };
}
