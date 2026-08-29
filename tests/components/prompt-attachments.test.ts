import { afterEach, describe, expect, it } from 'vitest';

import {
  HANDOFF_KEY,
  HANDOFF_MAX_BYTES,
  MAX_ATTACHMENTS,
  MAX_FILE_BYTES,
  describeRejections,
  stashAttachments,
  takeStashedAttachments,
  toHistoryAttachments,
  toWireAttachments,
  validateFiles,
  type PromptAttachment,
} from '@/components/prompt/attachments';

function makeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  // `File` derives `size` from its parts, so the only way to test the size gate without
  // allocating megabytes is to redefine the getter.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function makeAttachment(id: string, bytes = 32): PromptAttachment {
  return {
    id,
    name: `${id}.png`,
    mimeType: 'image/png',
    size: bytes,
    dataUrl: `data:image/png;base64,${'A'.repeat(bytes)}`,
    thumbUrl: 'data:image/jpeg;base64,AAA',
  };
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe('validateFiles', () => {
  it('accepts the supported image types', () => {
    const files = [
      makeFile('a.png', 'image/png', 1024),
      makeFile('b.jpg', 'image/jpeg', 1024),
      makeFile('c.webp', 'image/webp', 1024),
    ];
    const { accepted, rejected } = validateFiles(files, MAX_ATTACHMENTS);
    expect(accepted).toHaveLength(3);
    expect(rejected).toEqual([]);
  });

  it('rejects non-images and SVG, which is an image to the browser but a script to a provider', () => {
    const { accepted, rejected } = validateFiles(
      [makeFile('notes.pdf', 'application/pdf', 10), makeFile('logo.svg', 'image/svg+xml', 10)],
      MAX_ATTACHMENTS,
    );
    expect(accepted).toEqual([]);
    expect(rejected.map((entry) => entry.name)).toEqual(['notes.pdf', 'logo.svg']);
    expect(rejected[0]!.reason).toContain('supported image');
  });

  it('rejects files over the per-file byte cap', () => {
    const { accepted, rejected } = validateFiles(
      [makeFile('huge.png', 'image/png', MAX_FILE_BYTES + 1)],
      MAX_ATTACHMENTS,
    );
    expect(accepted).toEqual([]);
    expect(rejected[0]!.reason).toContain('larger than');
  });

  it('stops at the remaining slots and says so', () => {
    const files = [
      makeFile('a.png', 'image/png', 10),
      makeFile('b.png', 'image/png', 10),
      makeFile('c.png', 'image/png', 10),
    ];
    const { accepted, rejected } = validateFiles(files, 2);
    expect(accepted.map((file) => file.name)).toEqual(['a.png', 'b.png']);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toContain('limit');
  });

  it('accepts nothing once there are no slots left', () => {
    const { accepted, rejected } = validateFiles([makeFile('a.png', 'image/png', 10)], 0);
    expect(accepted).toEqual([]);
    expect(rejected).toHaveLength(1);
  });
});

describe('describeRejections', () => {
  it('is null when nothing was rejected, so no status line is shown', () => {
    expect(describeRejections([])).toBeNull();
  });

  it('names the single offender', () => {
    expect(describeRejections([{ name: 'a.pdf', reason: 'not supported' }])).toBe(
      'a.pdf was skipped — not supported.',
    );
  });

  it('summarises a batch rather than listing every file', () => {
    const message = describeRejections([
      { name: 'a.pdf', reason: 'not supported' },
      { name: 'b.pdf', reason: 'not supported' },
    ]);
    expect(message).toBe('2 files were skipped — not supported, and others.');
  });
});

describe('wire and history projections', () => {
  it('sends the full data URL upstream and never the thumbnail', () => {
    const wire = toWireAttachments([makeAttachment('one')]);
    expect(wire[0]).toEqual({
      name: 'one.png',
      mimeType: 'image/png',
      size: 32,
      dataUrl: expect.stringContaining('data:image/png'),
    });
    expect(wire[0]).not.toHaveProperty('thumbUrl');
  });

  it('persists the thumbnail and never the full data URL', () => {
    const history = toHistoryAttachments([makeAttachment('one')]);
    expect(history[0]).toEqual({ id: 'one', name: 'one.png', thumbUrl: 'data:image/jpeg;base64,AAA' });
    expect(history[0]).not.toHaveProperty('dataUrl');
  });
});

describe('landing → workspace handoff', () => {
  it('round-trips attachments and reports the full intended count', () => {
    const attachments = [makeAttachment('one'), makeAttachment('two')];
    expect(stashAttachments(attachments)).toEqual({ stashed: 2 });

    const handoff = takeStashedAttachments();
    expect(handoff.intended).toBe(2);
    expect(handoff.attachments.map((item) => item.id)).toEqual(['one', 'two']);
  });

  it('clears the stash on read, so refreshing the workspace does not re-attach', () => {
    stashAttachments([makeAttachment('one')]);
    expect(takeStashedAttachments().attachments).toHaveLength(1);
    expect(takeStashedAttachments().attachments).toHaveLength(0);
    expect(window.sessionStorage.getItem(HANDOFF_KEY)).toBeNull();
  });

  it('carries what fits and still reports how many were attached', () => {
    // Two attachments that cannot both fit under the quota.
    const big = [makeAttachment('one', HANDOFF_MAX_BYTES * 0.6), makeAttachment('two', HANDOFF_MAX_BYTES * 0.6)];
    expect(stashAttachments(big)).toEqual({ stashed: 1 });

    const handoff = takeStashedAttachments();
    expect(handoff.attachments).toHaveLength(1);
    // The shortfall is visible to the workspace, which is what lets it tell the user.
    expect(handoff.intended).toBe(2);
  });

  it('stashes nothing when even the first attachment is over the quota', () => {
    expect(stashAttachments([makeAttachment('one', HANDOFF_MAX_BYTES * 1.2)])).toEqual({ stashed: 0 });
    expect(takeStashedAttachments().attachments).toEqual([]);
  });

  it('survives a corrupt stash instead of throwing', () => {
    window.sessionStorage.setItem(HANDOFF_KEY, '{ not json');
    expect(takeStashedAttachments()).toEqual({ intended: 0, attachments: [] });
  });

  it('drops entries that are not attachments', () => {
    window.sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({ intended: 2, attachments: [makeAttachment('one'), { id: 'junk' }] }),
    );
    const handoff = takeStashedAttachments();
    expect(handoff.attachments.map((item) => item.id)).toEqual(['one']);
  });
});
