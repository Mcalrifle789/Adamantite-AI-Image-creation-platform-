/**
 * The perspective grid floor — ux-patterns.md §7.5. Pure CSS, static (it never animates — the
 * "never" is deliberate, listed once in ADR-05 as a fact worth stating twice), hidden below
 * `md`. Workspace only.
 */
export function GridFloor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-64 overflow-hidden md:block"
      style={{ perspective: '560px' }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, var(--color-ada-line-quiet) 0, var(--color-ada-line-quiet) 1px, transparent 1px, transparent 40px), ' +
            'repeating-linear-gradient(90deg, var(--color-ada-line-quiet) 0, var(--color-ada-line-quiet) 1px, transparent 1px, transparent 40px)',
          transform: 'rotateX(62deg)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
        }}
      />
    </div>
  );
}
