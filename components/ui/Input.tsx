'use client';

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from './utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

// ADR-06 refusal 2: placeholders are `text-muted` (7.8:1), never `text-faint` — they are the
// only instruction in most fields, so they cannot be decorative.
// `.glass-field` (styles/hud.css) supplies the frosted fill and the pressed-in neumorphic
// well, including the focus treatment — hence no `focus-visible:shadow-*` utility here. It is
// unlayered CSS, so it wins over Tailwind's layered utilities without an `!important`.
export const INPUT_BASE_CLASSES =
  'glass-field w-full h-10 rounded-md border px-3 text-sm text-ada-text ' +
  'placeholder:text-ada-text-muted transition-[border-color,box-shadow] duration-[var(--dur-1)] ease-[var(--ease-out)] ' +
  'focus:outline-none ' +
  'disabled:opacity-45 disabled:cursor-not-allowed aria-[invalid=true]:border-ada-danger';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(INPUT_BASE_CLASSES, className)} {...rest} />;
});
