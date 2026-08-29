'use client';

import { cloneElement, isValidElement, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FocusEvent, MouseEvent, ReactElement, ReactNode } from 'react';

const OPEN_DELAY_MS = 300;

export interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'bottom';
  /** A single focusable/hoverable element — cloned to receive the hover/focus handlers. */
  children: ReactElement<Record<string, unknown>>;
}

type Handler<E> = ((event: E) => void) | undefined;

function compose<E>(a: Handler<E>, b: (event: E) => void) {
  return (event: E) => {
    a?.(event);
    b(event);
  };
}

/** 300ms open delay, 0ms close delay, `--text-xs` — ux-patterns.md §10.1. Never the sole carrier
 * of essential information; it only ever supplements a visible, already-labelled control. */
export function Tooltip({ content, side = 'top', children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const id = useId();

  if (!isValidElement(children)) return children;

  function show() {
    timeoutRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          top: side === 'top' ? rect.top + window.scrollY - 8 : rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX + rect.width / 2,
        });
      }
      setOpen(true);
    }, OPEN_DELAY_MS);
  }

  function hide() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  }

  const childProps = children.props as Record<string, unknown>;
  const originalRef = (children as unknown as { ref?: unknown }).ref;

  const child = cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof originalRef === 'function') (originalRef as (n: HTMLElement | null) => void)(node);
      else if (originalRef && typeof originalRef === 'object') {
        (originalRef as { current: HTMLElement | null }).current = node;
      }
    },
    onMouseEnter: compose(childProps.onMouseEnter as Handler<MouseEvent>, show),
    onMouseLeave: compose(childProps.onMouseLeave as Handler<MouseEvent>, hide),
    onFocus: compose(childProps.onFocus as Handler<FocusEvent>, show),
    onBlur: compose(childProps.onBlur as Handler<FocusEvent>, hide),
    'aria-describedby': open ? id : (childProps['aria-describedby'] as string | undefined),
  } as Record<string, unknown>);

  return (
    <>
      {child}
      {open && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              id={id}
              style={{
                position: 'absolute',
                top: position.top,
                left: position.left,
                transform: side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
              }}
              className="glass-panel z-50 max-w-xs rounded-md px-2 py-1 text-xs text-ada-text"
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
