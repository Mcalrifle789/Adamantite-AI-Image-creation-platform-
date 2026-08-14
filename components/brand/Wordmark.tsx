import type { ElementType } from 'react';

export type WordmarkSize = 'hero' | 'header';

export interface WordmarkProps {
  size?: WordmarkSize;
  /** Renders the italic "Agent" lockup line beneath the mark. */
  withAgent?: boolean;
  as?: 'h1' | 'span';
  className?: string;
}

// ux-patterns.md §4.2 / ADR-07: real, selectable text — never a raster or a reproduced mosaic.
// `-webkit-text-stroke` + `background-clip: text` are non-standard-but-universally-supported;
// `@supports not` falls back to a solid fill, no stroke, so the lockup still reads correctly.
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
          {/* Elegant lighter-weight lockup line — soft cyan, wide tracking, no glow (kept
           * subordinate to the "Adamantite" mark above). */}
          <span
            aria-hidden="true"
            className="-mt-[0.12em] block font-display text-[0.24em] font-light uppercase tracking-[0.42em] text-ada-cyan-300/85"
          >
            Agent
          </span>
        </>
      ) : null}
    </Component>
  );
}
