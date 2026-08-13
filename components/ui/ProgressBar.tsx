import { cn } from './utils';

export interface ProgressBarProps {
  /** 0..100. */
  value: number;
  label?: string;
  className?: string;
}

/** 2px track, cyan-400 fill — ux-patterns.md §10.1. Progress is real information (§12.2: "never
 * faked backwards, never sits at 99%"), so callers pass the server-reported value verbatim.
 * The fill is a full-width element scaled with `transform: scaleX()` rather than an animated
 * `width` — ux-patterns.md §8 forbids animating layout properties; `transform` is on the
 * allow-list. */
export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-0.5 w-full overflow-hidden rounded-full bg-[color:var(--color-ada-line-quiet)]', className)}
    >
      <div
        className="h-full w-full origin-left rounded-full bg-ada-cyan-400 transition-transform duration-[var(--dur-2)] ease-[var(--ease-out)]"
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}
