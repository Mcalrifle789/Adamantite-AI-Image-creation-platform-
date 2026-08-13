import { describe, expect, it } from 'vitest';

import {
  hashString,
  synthesizeArt,
  type SvgArtParams,
} from '../../../lib/server/providers/mock/svgArt';

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

const BASE_PARAMS: SvgArtParams = {
  prompt: 'a cyan wolf howling at a chrome moon',
  seed: 41822,
  modelId: 'nano-banana-2',
  aspectRatio: '1:1',
  kind: 'image',
};

describe('hashString', () => {
  it('is deterministic for identical input', () => {
    expect(hashString('adamantite')).toBe(hashString('adamantite'));
  });

  it('differs for different input', () => {
    expect(hashString('adamantite')).not.toBe(hashString('adamantite2'));
  });

  it('always returns a non-negative 32-bit integer', () => {
    const hash = hashString('anything at all');
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
  });
});

describe('synthesizeArt — determinism', () => {
  it('produces byte-identical output for identical inputs', () => {
    const first = synthesizeArt(BASE_PARAMS);
    const second = synthesizeArt({ ...BASE_PARAMS });

    expect(first.bytes).toEqual(second.bytes);
    expect(decode(first.bytes)).toBe(decode(second.bytes));
    expect(first.width).toBe(second.width);
    expect(first.height).toBe(second.height);
  });

  it('produces different output for a different prompt', () => {
    const first = synthesizeArt(BASE_PARAMS);
    const second = synthesizeArt({ ...BASE_PARAMS, prompt: 'a field of tulips at dawn' });

    expect(decode(first.bytes)).not.toBe(decode(second.bytes));
  });

  it('produces different output for a different seed', () => {
    const first = synthesizeArt(BASE_PARAMS);
    const second = synthesizeArt({ ...BASE_PARAMS, seed: 7 });

    expect(decode(first.bytes)).not.toBe(decode(second.bytes));
  });

  it('produces different output for a different modelId', () => {
    const first = synthesizeArt(BASE_PARAMS);
    const second = synthesizeArt({ ...BASE_PARAMS, modelId: 'veo-3-1' });

    expect(decode(first.bytes)).not.toBe(decode(second.bytes));
  });
});

describe('synthesizeArt — shape and sizing', () => {
  it('returns image/svg+xml for image kind, no durationSeconds', () => {
    const output = synthesizeArt(BASE_PARAMS);
    expect(output.mimeType).toBe('image/svg+xml');
    expect(output.durationSeconds).toBeUndefined();
    expect(output.width).toBeGreaterThan(0);
    expect(output.height).toBeGreaterThan(0);
  });

  it('sizes the canvas to the requested aspect ratio', () => {
    const square = synthesizeArt({ ...BASE_PARAMS, aspectRatio: '1:1' });
    expect(square.width).toBe(square.height);

    const widescreen = synthesizeArt({ ...BASE_PARAMS, aspectRatio: '16:9' });
    expect(widescreen.width).toBeGreaterThan(widescreen.height);

    const portrait = synthesizeArt({ ...BASE_PARAMS, aspectRatio: '9:16' });
    expect(portrait.height).toBeGreaterThan(portrait.width);
  });

  it('falls back gracefully to a square for an unrecognised aspect ratio string', () => {
    const output = synthesizeArt({ ...BASE_PARAMS, aspectRatio: 'not-a-ratio' });
    expect(output.width).toBeGreaterThan(0);
    expect(output.height).toBeGreaterThan(0);
  });

  it('keeps output small — a few KB, not hundreds', () => {
    const output = synthesizeArt(BASE_PARAMS);
    expect(output.bytes.byteLength).toBeLessThan(20_000);
  });

  it('is well-formed SVG referencing the Adamantite palette', () => {
    const svg = decode(synthesizeArt(BASE_PARAMS).bytes);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain('</svg>');
    expect(svg).toContain('#05070D'); // ada-bg
    expect(svg.toLowerCase()).toMatch(/#(1e90ff|22d3ee|7ce3ff|4fa8ff)/); // blue/cyan accents
  });
});

describe('synthesizeArt — video kind', () => {
  it('reports durationSeconds: 5 and mimeType image/svg+xml', () => {
    const output = synthesizeArt({ ...BASE_PARAMS, kind: 'video' });
    expect(output.mimeType).toBe('image/svg+xml');
    expect(output.durationSeconds).toBe(5);
  });

  it('embeds a genuine CSS @keyframes animation, not SMIL-only', () => {
    const svg = decode(synthesizeArt({ ...BASE_PARAMS, kind: 'video' }).bytes);
    expect(svg).toContain('@keyframes');
    expect(svg).toContain('animation:');
    expect(svg).not.toContain('<animate'); // no SMIL-only animation
  });

  it('does not embed animation CSS for the image kind', () => {
    const svg = decode(synthesizeArt({ ...BASE_PARAMS, kind: 'image' }).bytes);
    expect(svg).not.toContain('@keyframes');
    expect(svg).not.toContain('<style>');
  });
});
