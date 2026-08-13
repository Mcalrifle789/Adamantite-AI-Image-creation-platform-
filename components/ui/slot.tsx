'use client';

import { cloneElement, isValidElement } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';

/**
 * A minimal `asChild` primitive (no Radix in this project's dependency list). Merges the
 * Slot's own props onto its single child element instead of rendering a wrapper — so
 * `<Button asChild><Link href="/pricing">Upgrade</Link></Button>` renders one real `<a>`.
 */

type AnyProps = Record<string, unknown> & {
  className?: string;
  style?: React.CSSProperties;
  ref?: Ref<unknown>;
};

export interface SlotProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  // React 19: function components only receive `ref` as a prop when their prop type declares
  // it — there is no implicit forwarding without `forwardRef`.
  ref?: Ref<HTMLElement>;
}

function composeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps };

  if (slotProps.className || childProps.className) {
    merged.className = cnJoin(slotProps.className, childProps.className);
  }
  if (slotProps.style || childProps.style) {
    merged.style = { ...slotProps.style, ...childProps.style };
  }
  for (const key of Object.keys(slotProps)) {
    if (key.startsWith('on') && typeof slotProps[key] === 'function' && typeof childProps[key] === 'function') {
      const slotHandler = slotProps[key] as (...args: unknown[]) => void;
      const childHandler = childProps[key] as (...args: unknown[]) => void;
      merged[key] = (...args: unknown[]) => {
        childHandler(...args);
        slotHandler(...args);
      };
    }
  }
  if (slotProps.ref || childProps.ref) {
    merged.ref = composeRefs(slotProps.ref, childProps.ref);
  }
  return merged;
}

function cnJoin(a?: string, b?: string): string {
  return [a, b].filter(Boolean).join(' ');
}

export function Slot({ children, ...slotProps }: SlotProps) {
  if (!isValidElement(children)) return null;
  const child = children as ReactElement<AnyProps>;
  return cloneElement(child, mergeProps(slotProps as AnyProps, (child.props ?? {}) as AnyProps));
}
