import type { ElementType } from 'react';

export type WordmarkSize = 'hero' | 'header';

export interface WordmarkProps {
  size?: WordmarkSize;
  /** Renders the italic "Agent" lockup line beneath the mark. */
  withAgent?: boolean;
  as?: 'h1' | 'span';
  className?: string;
}

// ux-patterns.md §4.2 / ADR-07: real, selectable text — and, since 2026-09-04 (user direction),
// the landing *hero* title is the revisioned logo raster instead (`components/brand/LogoHero.tsx`).
// This component remains the typographic lockup for the header nav and auth pages, where a
// raster at 24px would be unreadable. `-webkit-text-stroke` + `background-clip: text` are
// non-standard-but-universally-supported; `@supports not` falls back to a solid fill, no
// stroke, so the lockup still reads correctly.
const SIZE_CLASSES: Record<WordmarkSize, string> = {
  hero: 'text-[clamp(3rem,11vw,8.5rem)] leading-[0.92] tracking-[-0.02em]',
  header: 'text-2xl leading-none tracking-[-0.01em]',
};

export function Wordmark({ size = 'header', withAgent = false, as, className }: WordmarkProps) {
  const Component: ElementType = as ?? (size === 'hero' ? 'h1' : 'span');
  const classes = ['ada-wordmark', 'font-display font-semibold', SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      className={classes}
      aria-label={withAgent ? 'Adamantite Agent' : undefined}
    >
      Adamantite
      {withAgent ? (
        <>
          <br />
          {/* ADR-06 refusal 1: no text-shadow glow below 24px. At the minimum hero clamp
           * (3rem/48px) 0.28em is ~13px, so the "Agent" line never gets the wordmark's glow
           * treatment — it is a plain solid-colour italic, unlike the "Adamantite" line above. */}
          <span
            aria-hidden="true"
            className="block font-display text-[0.28em] font-medium italic tracking-[0.06em] text-ada-blue-300"
          >
            Agent
          </span>
        </>
      ) : null}
    </Component>
  );
}
