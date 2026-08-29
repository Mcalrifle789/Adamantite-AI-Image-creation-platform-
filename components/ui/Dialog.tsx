'use client';

import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

import { HudFrame } from '../hud/HudFrame';
import { useBodyScrollLock, useFocusTrap } from './useFocusTrap';
import { cn } from './utils';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** HUD-framed modal — ux-patterns.md §9, §10.1: focus trapped, `Esc` closes, focus restored to
 * the trigger, `aria-modal="true"`, labelled by its heading, body scroll locked. The scrim's
 * `backdrop-filter: blur(12px)` is doing semantic work, not decoration: per HIG, blur is the
 * signal that the layer behind is dismissible. The frame itself is frosted via `.hud__inner`. */
export function Dialog({ open, onClose, title, children, footer, className }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(containerRef, open, onClose);
  useBodyScrollLock(open);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[color:var(--color-ada-scrim)] backdrop-blur-[12px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('relative w-full max-w-md animate-[ada-fade-in_var(--dur-3)_var(--ease-out)]', className)}
      >
        <HudFrame tone="default" innerClassName="p-5">
          <h2 id={titleId} className="text-lg font-semibold text-ada-text">
            {title}
          </h2>
          <div className="mt-3 text-sm text-ada-text-muted">{children}</div>
          {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
        </HudFrame>
      </div>
    </div>,
    document.body,
  );
}
