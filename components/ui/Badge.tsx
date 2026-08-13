import type { ReactNode } from 'react';

import { cn } from './utils';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'tier';
export type BadgeTierAccent = 'blue' | 'cyan' | 'purple' | 'magenta';

export interface BadgeProps {
  tone?: BadgeTone;
  /** Only meaningful when `tone === 'tier'` — api-contract.md `Plan.accent`. */
  tierAccent?: BadgeTierAccent;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<Exclude<BadgeTone, 'tier'>, string> = {
  neutral: 'bg-ada-surface-3 text-ada-text-muted border-[color:var(--color-ada-line)]',
  info: 'bg-ada-surface-2 text-ada-blue-400 border-[color:var(--color-ada-line-strong)]',
  success: 'bg-ada-surface-2 text-ada-success border-[color:rgb(52_211_153_/_0.4)]',
  warning: 'bg-ada-surface-2 text-ada-warning border-[color:rgb(251_191_36_/_0.4)]',
  danger: 'bg-ada-surface-2 text-ada-danger border-[color:rgb(251_113_133_/_0.4)]',
};

// api-contract.md Plan.accent -> the tier ramp token that carries it (ux-patterns.md §2).
const TIER_ACCENT_CLASSES: Record<BadgeTierAccent, string> = {
  blue: 'bg-ada-surface-2 text-ada-tier-port border-[color:rgb(59_130_246_/_0.4)]',
  cyan: 'bg-ada-surface-2 text-ada-tier-standard border-[color:rgb(34_211_238_/_0.4)]',
  purple: 'bg-ada-surface-2 text-ada-tier-pro border-[color:rgb(167_139_250_/_0.4)]',
  magenta: 'bg-ada-surface-2 text-ada-tier-max border-[color:rgb(244_114_182_/_0.4)]',
};

/** `--text-2xs` mono uppercase label. Never the only signal for a status — callers pair it with
 * a word already carried in `children`, colour is decoration on top (ADR-06 refusal 4). */
export function Badge({ tone = 'neutral', tierAccent = 'blue', children, className }: BadgeProps) {
  const toneClasses = tone === 'tier' ? TIER_ACCENT_CLASSES[tierAccent] : TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.08em]',
        toneClasses,
        className,
      )}
    >
      {children}
    </span>
  );
}
