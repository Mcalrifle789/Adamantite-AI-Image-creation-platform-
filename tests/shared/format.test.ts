import { describe, expect, it } from 'vitest';

import { formatBytes, formatCredits, formatDate, formatElapsed, promptSlug } from '../../lib/shared/format';

describe('formatCredits', () => {
  it('adds thousands separators', () => {
    expect(formatCredits(39950)).toBe('39,950');
  });

  it('truncates fractional input defensively (credits are always integers)', () => {
    expect(formatCredits(600.9)).toBe('600');
  });

  it('returns an em dash for non-finite input', () => {
    expect(formatCredits(Number.NaN)).toBe('—');
  });
});

describe('formatElapsed', () => {
  it('formats under a minute as MM:SS', () => {
    expect(formatElapsed(6)).toBe('00:06');
  });

  it('formats minutes and seconds', () => {
    expect(formatElapsed(125)).toBe('02:05');
  });

  it('formats past an hour as H:MM:SS', () => {
    expect(formatElapsed(3661)).toBe('1:01:01');
  });

  it('clamps negative input to zero', () => {
    expect(formatElapsed(-5)).toBe('00:00');
  });
});

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats kilobytes with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes with one decimal', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('returns an em dash for negative input', () => {
    expect(formatBytes(-1)).toBe('—');
  });
});

describe('promptSlug', () => {
  it('lowercases and kebab-cases', () => {
    expect(promptSlug('A Neon City At Night')).toBe('a-neon-city-at-night');
  });

  it('truncates to 40 characters', () => {
    const long = 'x'.repeat(80);
    expect(promptSlug(long).length).toBeLessThanOrEqual(40);
  });

  it('falls back to "untitled" for input with no alphanumerics', () => {
    expect(promptSlug('   ')).toBe('untitled');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO timestamp', () => {
    expect(formatDate('2026-08-12T05:26:41.123Z')).not.toBe('—');
  });

  it('returns an em dash for an invalid timestamp', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});
