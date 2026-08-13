'use client';

import { forwardRef, useCallback, useRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

import { cn } from './utils';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const MAX_ROWS = 6;

const TEXTAREA_BASE_CLASSES =
  'w-full resize-none rounded-md border bg-ada-surface-2 border-[color:var(--color-ada-line)] px-3 py-2 text-sm text-ada-text ' +
  'placeholder:text-ada-text-muted transition-[border-color,box-shadow] duration-[var(--dur-1)] ease-[var(--ease-out)] ' +
  'focus:outline-none focus-visible:border-ada-blue-500 focus-visible:shadow-[var(--glow-2)] ' +
  'disabled:opacity-45 disabled:cursor-not-allowed aria-[invalid=true]:border-ada-danger';

/** Auto-grows up to `MAX_ROWS` (6) of text, then becomes internally scrollable — ux-patterns.md
 * §10.1. Height is measured against the element's own computed line-height so it tracks
 * whatever font-size a consumer applies. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, onInput, rows = 1, ...rest },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const autoGrow = useCallback((el: HTMLTextAreaElement) => {
    const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight) || 20;
    const maxHeight = lineHeight * MAX_ROWS;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      if (node) autoGrow(node);
    },
    [forwardedRef, autoGrow],
  );

  return (
    <textarea
      ref={setRefs}
      rows={rows}
      onInput={(event) => {
        autoGrow(event.currentTarget);
        onInput?.(event);
      }}
      className={cn(TEXTAREA_BASE_CLASSES, className)}
      {...rest}
    />
  );
});
