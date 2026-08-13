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
        'inline-flex items-center justify-center rounded-md border transition-[background-color,border-color,box-shadow,color] duration-[var(--dur-1)] ease-[var(--ease-out)]',
        'text-ada-text-muted hover:text-ada-text hover:bg-ada-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ada-cyan-300',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        active
          ? 'bg-ada-surface-3 border-[color:var(--color-ada-line-strong)] text-ada-text shadow-[var(--glow-1)]'
          : 'bg-transparent border-transparent',
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
});
