'use client';

import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

import { IconButton } from './IconButton';
import { useBodyScrollLock, useFocusTrap } from './useFocusTrap';
import { cn } from './utils';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Bottom sheet on mobile, right drawer from `md` up — ux-patterns.md §10.1, §11.2. Slides via
 * `transform` (never `width`/`right`/`left`, per the §8 motion allow-list). Same focus-trap,
 * `Esc`, and scroll-lock contract as `Dialog`. */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(containerRef, open, onClose);
  useBodyScrollLock(open);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-[color:var(--color-ada-scrim)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-lg border-t bg-ada-surface-1',
          'border-[color:var(--color-ada-line)] shadow-[var(--glow-1)]',
          'animate-[ada-slide-up_var(--dur-3)_var(--ease-out)]',
          'md:inset-y-0 md:inset-x-auto md:right-0 md:bottom-auto md:h-full md:w-[400px] md:max-h-none md:rounded-t-none md:rounded-l-lg md:border-t-0 md:border-l',
          'md:animate-[ada-slide-in-right_var(--dur-3)_var(--ease-out)]',
          className,
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--color-ada-line-quiet)] px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-ada-text">
            {title}
          </h2>
          <IconButton aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
