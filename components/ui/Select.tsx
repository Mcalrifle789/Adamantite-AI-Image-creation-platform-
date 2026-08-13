'use client';

import type { ReactNode } from 'react';

import { Menu, type MenuItemDef } from './Menu';
import { cn } from './utils';

export interface SelectOption<T extends string = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  id?: string;
}

/** Built on `Menu` — ux-patterns.md §10.1 groups Select and Menu as one headless pattern. */
export function Select<T extends string = string>({
  value,
  options,
  onChange,
  placeholder,
  className,
  ...rest
}: SelectProps<T>) {
  const items: MenuItemDef[] = options.map((option) => ({
    id: option.value,
    label: option.label,
    disabled: option.disabled,
    onSelect: () => onChange(option.value),
  }));
  const selected = options.find((option) => option.value === value);

  return (
    <Menu items={items}>
      {(trigger) => (
        <button
          type="button"
          {...trigger}
          {...rest}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border bg-ada-surface-2 border-[color:var(--color-ada-line)] px-3 text-sm text-ada-text',
            'transition-[border-color,box-shadow] duration-[var(--dur-1)] ease-[var(--ease-out)]',
            'focus:outline-none focus-visible:border-ada-blue-500 focus-visible:shadow-[var(--glow-2)]',
            className,
          )}
        >
          <span className={selected ? undefined : 'text-ada-text-muted'}>
            {selected ? selected.label : placeholder}
          </span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-ada-text-muted">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </Menu>
  );
}
