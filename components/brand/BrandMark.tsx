export interface BrandMarkProps {
  size?: number;
  className?: string;
  /** Decorative by default (`alt=""` equivalent — `aria-hidden`). Pass a label when the mark is
   * the only content of an otherwise-unlabelled control. */
  title?: string;
}

/**
 * A small chamfered-"A" glyph — the same geometric language as `app/icon.svg` (A5's
 * hand-authored favicon, ADR-07), reusable inline wherever a compact brand mark is needed next
 * to the typographic `Wordmark` (e.g. a collapsed rail, a loading state). Solid `blue-500` on
 * transparent, no gradient or stroke — those effects belong to the wordmark only.
 */
export function BrandMark({ size = 24, className, title }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M16 4 L27 26 L21.5 26 L19.3 21 L12.7 21 L10.5 26 L5 26 L14.5 6 Z M16 10.5 L13.4 16.5 L18.6 16.5 Z"
        fill="var(--color-ada-blue-500)"
      />
    </svg>
  );
}
