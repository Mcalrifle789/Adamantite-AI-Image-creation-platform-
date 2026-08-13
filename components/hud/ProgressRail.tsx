export interface ProgressRailProps {
  /** 0..100. */
  value: number;
  label?: string;
}

/** The 2px bar riding a `HudFrame`'s bottom edge — ux-patterns.md §10.2, used during `running`
 * generations (§12.2). Positioned absolutely; the parent `HudFrame`'s child wrapper must be
 * `position: relative` (it is — `.hud` sets `position: relative`). Fill uses `transform:
 * scaleX()`, not `width`, per the §8 motion allow-list. */
export function ProgressRail({ value, label }: ProgressRailProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Generation progress'}
      className="absolute inset-x-0 bottom-0 z-10 h-0.5 overflow-hidden bg-[color:var(--color-ada-line-quiet)]"
    >
      <div
        className="h-full w-full origin-left bg-ada-cyan-400 transition-transform duration-[var(--dur-2)] ease-[var(--ease-out)]"
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}
