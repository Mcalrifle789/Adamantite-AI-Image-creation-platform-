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
    'bg-[rgb(30_144_255_/_0.82)] text-ada-text-invert border border-[rgb(124_227_255_/_0.38)] shadow-[0_10px_30px_-14px_rgb(30_144_255_/_0.8),inset_0_1px_0_rgb(255_255_255_/_0.18)] hover:bg-[rgb(79_168_255_/_0.9)] active:bg-[rgb(10_111_212_/_0.88)]',
  outline:
    'bg-[rgb(16_24_39_/_0.46)] text-ada-text border border-[rgb(79_168_255_/_0.52)] shadow-[0_10px_26px_-18px_rgb(30_144_255_/_0.7),inset_0_1px_0_rgb(255_255_255_/_0.08)] hover:bg-[rgb(24_32_47_/_0.62)]',
  secondary:
    'bg-[rgb(16_24_39_/_0.42)] text-ada-text border border-[color:var(--color-ada-line)] shadow-[0_8px_24px_-18px_rgb(124_227_255_/_0.48),inset_0_1px_0_rgb(255_255_255_/_0.07)] hover:border-[color:var(--color-ada-line-strong)] hover:bg-[rgb(24_32_47_/_0.6)]',
  ghost:
    'bg-[rgb(16_24_39_/_0.16)] text-ada-text-muted border border-transparent shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] hover:text-ada-text hover:bg-[rgb(16_24_39_/_0.42)]',
  danger:
    'bg-[rgb(16_24_39_/_0.42)] text-ada-danger border border-[color:rgb(251_113_133_/_0.45)] shadow-[0_8px_24px_-18px_rgb(251_113_133_/_0.55),inset_0_1px_0_rgb(255_255_255_/_0.07)] hover:shadow-[var(--glow-danger)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 min-w-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 min-w-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 min-w-12 px-6 text-base gap-2 rounded-lg',
};

const BASE_CLASSES =
  'relative inline-flex items-center justify-center whitespace-nowrap font-medium ' +
  'backdrop-blur-md backdrop-saturate-150 transition-[background-color,border-color,box-shadow,color,transform] duration-[var(--dur-2)] ease-[var(--ease-out)] hover:-translate-y-0.5 active:translate-y-0 ' +
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
