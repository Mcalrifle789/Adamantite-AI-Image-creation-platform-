'use client';

import { cloneElement, isValidElement, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from './utils';

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  /** A single form control (`Input`, `Textarea`, `Select`, …). `Field` wires its `id`,
   * `aria-describedby` and `aria-invalid` — ux-patterns.md §10.1. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>;
}

/** Label + control + hint + error, with every accessibility wire connected. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = children.props.id ?? `field-${autoId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': Boolean(error) || undefined,
      })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className="text-sm font-medium text-ada-text">
        {label}
        {required ? (
          <span className="text-ada-danger" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className="text-xs text-ada-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-ada-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
