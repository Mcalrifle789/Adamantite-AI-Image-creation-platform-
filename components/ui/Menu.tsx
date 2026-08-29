'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KeyboardEvent, ReactNode } from 'react';

import { cn } from './utils';

export interface MenuItemDef {
  id: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface MenuTriggerProps {
  ref: (node: HTMLButtonElement | null) => void;
  onClick: () => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  id: string;
}

export interface MenuProps {
  items: MenuItemDef[];
  align?: 'start' | 'end';
  className?: string;
  children: (trigger: MenuTriggerProps) => ReactNode;
}

/** Headless dropdown menu — ux-patterns.md §10.1, §9: real `role="menu"`, arrow-key navigation,
 * `Esc` closes and returns focus to the trigger, portalled so it stacks above everything else. */
export function Menu({ items, align = 'start', className, children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerId = useId();
  const setTriggerRef = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: (align === 'end' ? rect.right : rect.left) + window.scrollX,
      });
    }
    setOpen(true);
  }, [align]);

  useEffect(() => {
    if (!open) return undefined;
    const firstEnabled = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])',
    );
    firstEnabled?.focus();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const menuItems = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [],
      );
      const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          close();
          break;
        case 'ArrowDown': {
          event.preventDefault();
          const next = menuItems[(currentIndex + 1 + menuItems.length) % menuItems.length];
          next?.focus();
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prev = menuItems[(currentIndex - 1 + menuItems.length) % menuItems.length];
          prev?.focus();
          break;
        }
        case 'Home':
          event.preventDefault();
          menuItems[0]?.focus();
          break;
        case 'End':
          event.preventDefault();
          menuItems[menuItems.length - 1]?.focus();
          break;
        case 'Tab':
          close();
          break;
        default:
          break;
      }
    },
    [close],
  );

  return (
    <>
      {children({
        ref: setTriggerRef,
        onClick: () => (open ? close() : openMenu()),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        id: triggerId,
      })}
      {open && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-labelledby={triggerId}
              onKeyDown={handleKeyDown}
              style={{
                position: 'absolute',
                top: position.top,
                left: position.left,
                transform: align === 'end' ? 'translateX(-100%)' : undefined,
              }}
              className={cn(
                'glass-panel z-50 min-w-40 rounded-lg p-1',
                className,
              )}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={item.disabled || undefined}
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onSelect();
                    close();
                  }}
                  className={cn(
                    'flex w-full items-center rounded-sm px-2.5 py-2 text-left text-sm outline-none transition-colors duration-[var(--dur-1)]',
                    'text-ada-text hover:bg-[rgb(120_190_255_/_0.12)] focus-visible:bg-[rgb(120_190_255_/_0.16)]',
                    item.destructive && 'text-ada-danger',
                    item.disabled && 'cursor-not-allowed opacity-45',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
