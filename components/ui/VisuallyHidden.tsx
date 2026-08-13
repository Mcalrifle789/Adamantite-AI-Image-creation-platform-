import type { ElementType, HTMLAttributes, ReactNode } from 'react';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

/** Standard clip-pattern visually-hidden text — Tailwind's built-in `sr-only` utility
 * (absolute, 1px clip-rect, no reflow) so it never differs from any other `sr-only` usage in
 * the codebase. ux-patterns.md §10.1. */
export function VisuallyHidden({ as: Component = 'span', className, children, ...rest }: VisuallyHiddenProps) {
  return (
    <Component className={className ? `sr-only ${className}` : 'sr-only'} {...rest}>
      {children}
    </Component>
  );
}
