'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Slot } from './slot';
import { Spinner } from './Spinner';
import { cn } from './utils';

export type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Swaps the label for a 16px spinner. The label stays in the layout (just `invisible`) so
   * the button's width never jumps — ux-patterns.md §10.1, §13. */
  loading?: boolean;
  /** Renders the single child (typically a `next/link` `<a>`) with this button's props merged
   * onto it via `Slot`, instead of a real `<button>`. */
  asChild?: boolean;
  children?: ReactNode;
}

// ADR-06 refusal 3 / ux-patterns.md §3: exactly two verified primary treatments exist. `primary`
// is the blue-500 fill — it MUST carry `--color-ada-text-invert` (6.3:1), never `ada-text`
// (which measures 3.0:1 on this fill and fails AA). There is no third variant of this button.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-ada-blue-500 text-ada-text-invert border border-transparent shadow-[var(--glow-2)] hover:bg-ada-blue-600 active:bg-ada-blue-600',
  outline:
    'bg-ada-surface-2 text-ada-text border border-ada-blue-500 hover:bg-ada-surface-3',
  secondary:
    'bg-ada-surface-2 text-ada-text border border-[color:var(--color-ada-line)] hover:border-[color:var(--color-ada-line-strong)] hover:bg-ada-surface-3',
  ghost:
    'bg-transparent text-ada-text-muted border border-transparent hover:text-ada-text hover:bg-ada-surface-2',
  danger:
    'bg-ada-surface-2 text-ada-danger border border-[color:rgb(251_113_133_/_0.45)] hover:shadow-[var(--glow-danger)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 min-w-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 min-w-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 min-w-12 px-6 text-base gap-2 rounded-lg',
};

const BASE_CLASSES =
  'relative inline-flex items-center justify-center whitespace-nowrap font-medium ' +
  'transition-[background-color,border-color,box-shadow,color] duration-[var(--dur-1)] ease-[var(--ease-out)] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ada-cyan-300 ' +
  'disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    asChild = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = Boolean(disabled) || loading;
  const classes = cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);

  if (asChild) {
    return (
      <Slot ref={ref as never} className={classes} aria-disabled={isDisabled || undefined} {...rest}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className={loading ? 'invisible inline-flex items-center gap-[inherit]' : 'inline-flex items-center gap-[inherit]'}>
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <Spinner />
        </span>
      ) : null}
    </button>
  );
});
