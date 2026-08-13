import { describe, expect, it } from 'vitest';

import type { ProviderJobStatus, ProviderOutput } from '../../../lib/server/providers/types';

/**
 * ADR-02 ("The awkward part: mock video"): all M1 mock output is SVG, so the `video/mp4` branch
 * of anything that switches on `Asset.mimeType` (chiefly A4's `MediaSurface`) is exercised in
 * only one direction until a real provider lands. ADR-02 explicitly requires A3's test suite to
 * feed a synthetic `video/mp4` asset through the seam's own types so that branch is not silently
 * dead code from day one — i.e. `ProviderOutput`/`ProviderJobStatus` must genuinely accommodate a
 * real provider's output, not just the mock's SVG shape.
 */

const SYNTHETIC_MP4_BYTES = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]); // "....ftyp"-ish

describe('ProviderOutput / ProviderJobStatus accept a real, non-SVG provider output (ADR-02)', () => {
  it('accepts a synthetic video/mp4 ProviderOutput with no SVG-specific assumption', () => {
    const output: ProviderOutput = {
      mimeType: 'video/mp4',
      bytes: SYNTHETIC_MP4_BYTES,
      width: 1280,
      height: 720,
      durationSeconds: 5,
    };

    expect(output.mimeType).toBe('video/mp4');
    expect(output.bytes.byteLength).toBeGreaterThan(0);
    expect(output.durationSeconds).toBe(5);
  });

  it('accepts a synthetic video/mp4 output inside a succeeded ProviderJobStatus', () => {
    const status: ProviderJobStatus = {
      state: 'succeeded',
      progress: 100,
      outputs: [
        {
          mimeType: 'video/mp4',
          bytes: SYNTHETIC_MP4_BYTES,
          width: 1920,
          height: 1080,
          durationSeconds: 5,
        },
      ],
      costMicroUsd: 12_000,
    };

    expect(status.state).toBe('succeeded');
    if (status.state !== 'succeeded') throw new Error('unreachable');
    expect(status.outputs[0]?.mimeType).toBe('video/mp4');
  });

  it('accepts an image/png ProviderOutput just as readily (a real image adapter is not tied to SVG)', () => {
    const output: ProviderOutput = {
      mimeType: 'image/png',
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      width: 1024,
      height: 1024,
    };
    expect(output.durationSeconds).toBeUndefined();
  });
});
