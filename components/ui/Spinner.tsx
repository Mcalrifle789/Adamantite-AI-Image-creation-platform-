export interface SpinnerProps {
  size?: number;
  className?: string;
}

/** 16px loading spinner used by `Button`'s loading state. Rotation uses `transform`, which is
 * on the motion allow-list (ux-patterns.md §8); duration is collapsed to 1ms by the global
 * `prefers-reduced-motion` override in styles/theme.css, so no separate reduced-motion branch
 * is needed here. */
export function Spinner({ size = 16, className }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cnSpinner(className)}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function cnSpinner(className?: string): string {
  return className ? `animate-[ada-spin_0.7s_linear_infinite] ${className}` : 'animate-[ada-spin_0.7s_linear_infinite]';
}
