export interface LiveRegionProps {
  politeness: 'polite' | 'assertive';
  message: string;
  className?: string;
}

/** A visually-hidden `aria-live` region. ux-patterns.md §9: one polite region announces
 * generation transitions ("Generating with Nano Banana 2", "Image ready", "Generation failed:
 * provider rejected"); one assertive region is reserved for errors that block the user (e.g.
 * out of credits). **Callers must not push the progress percentage into either region on every
 * tick** — only at start, completion, and failure — or the region becomes noise a screen-reader
 * user cannot escape. */
export function LiveRegion({ politeness, message, className }: LiveRegionProps) {
  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
      className={className ? `sr-only ${className}` : 'sr-only'}
    >
      {message}
    </div>
  );
}

/** Preconfigured convenience wrapper for generation-transition announcements. */
export function PoliteLiveRegion({ message, className }: Omit<LiveRegionProps, 'politeness'>) {
  return <LiveRegion politeness="polite" message={message} className={className} />;
}

/** Preconfigured convenience wrapper for blocking errors (e.g. out of credits). */
export function AssertiveLiveRegion({ message, className }: Omit<LiveRegionProps, 'politeness'>) {
  return <LiveRegion politeness="assertive" message={message} className={className} />;
}
