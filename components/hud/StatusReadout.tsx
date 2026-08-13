import type { ReactNode } from 'react';

export type StatusReadoutTone = 'default' | 'active' | 'danger' | 'success';

export interface StatusReadoutProps {
  /** e.g. `"QUEUED"`, `"RUNNING · 47%"` — ux-patterns.md §4.1, §12.2. Callers compose the mono
   * word themselves so status is always identifiable by text, never colour alone
   * (ADR-06 refusal 4). */
  children: ReactNode;
  tone?: StatusReadoutTone;
  className?: string;
}

const TONE_CLASSES: Record<StatusReadoutTone, string> = {
  default: 'text-ada-text-muted',
  active: 'text-ada-cyan-400',
  danger: 'text-ada-danger',
  success: 'text-ada-success',
};

/** Mono `QUEUED · 00:04` readout — ux-patterns.md §10.2. Tabular numerals inherited from
 * `--font-mono` (see `font-feature-settings` on the mono face) so an elapsed timer never jitters. */
export function StatusReadout({ children, tone = 'default', className }: StatusReadoutProps) {
  return (
    <span
      className={cx('font-mono text-2xs uppercase tracking-[0.08em]', TONE_CLASSES[tone], className)}
    >
      {children}
    </span>
  );
}

function cx(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}
