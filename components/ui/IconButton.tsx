'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './utils';

export type IconButtonSize = 32 | 40;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required, not optional — an icon-only control with no accessible name is a dead end for
   * every non-visual user. Enforced by the type, not by convention (ux-patterns.md §10.1). */
  'aria-label': string;
  size?: IconButtonSize;
  active?: boolean;
  children: ReactNode;
}

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  32: 'h-8 w-8',
  40: 'h-10 w-10',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 32, active = false, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        // Soft-UI rather than glass: an icon button is *attached* to the bar it sits in, so it
        // extrudes from that surface instead of floating over the aurora. `.neu-pressable`
        // swaps the raised shadow for a pressed one on `:active` and on `aria-pressed`, with no
        // geometry change — so there is never a layout shift on press.
        'neu-pressable inline-flex items-center justify-center rounded-md',
        'text-ada-text-muted hover:text-ada-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ada-cyan-300',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        active && 'border-[color:var(--color-ada-line-strong)] text-ada-text',
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
});
