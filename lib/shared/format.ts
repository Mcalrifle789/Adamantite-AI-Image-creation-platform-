/**
 * Formatters shared between the server (downloads, logging) and the client (UI). All credit
 * figures stay integers all the way through — nothing here introduces a float into a credit
 * path. See `.agents/design/ux-patterns.md` §4.1 (tabular numerals) and §4 (mono figures).
 */

import { PROMPT_SLUG_MAX_LENGTH } from './constants';

const CREDIT_FORMATTER = new Intl.NumberFormat('en-US', {
  useGrouping: true,
  maximumFractionDigits: 0,
});

/** Formats an integer credit amount with thousands separators, e.g. `39950` -> `"39,950"`. */
export function formatCredits(credits: number): string {
  if (!Number.isFinite(credits)) return '—';
  return CREDIT_FORMATTER.format(Math.trunc(credits));
}

/**
 * Formats a whole-second elapsed duration as tabular `MM:SS`, or `H:MM:SS` once it passes an
 * hour. Used by `StatusReadout` so the timer does not jitter (ux-patterns.md §12.2).
 */
export function formatElapsed(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Formats a byte count as a human-readable size, e.g. `1536` -> `"1.5 KB"`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const unit = BYTE_UNITS[exponent] ?? 'B';
  const precision = exponent === 0 ? 0 : 1;

  return `${value.toFixed(precision)} ${unit}`;
}

/**
 * Formats an ISO-8601 timestamp for display, e.g. `"2026-08-12T05:26:41.123Z"` ->
 * `"Aug 12, 2026, 5:26 AM"`. Returns an em dash for anything unparseable rather than throwing.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Slugifies a prompt for the asset download filename:
 * `adamantite-<slug>-<shortId>.<ext>` — api-contract.md §7.2. Lowercased, kebab-cased, the
 * first {@link PROMPT_SLUG_MAX_LENGTH} characters of the trimmed prompt.
 */
export function promptSlug(prompt: string): string {
  const slug = prompt
    .trim()
    .toLowerCase()
    .slice(0, PROMPT_SLUG_MAX_LENGTH)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 ? slug : 'untitled';
}
