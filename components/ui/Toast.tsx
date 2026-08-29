'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { cn } from './utils';

export type ToastTone = 'neutral' | 'success' | 'danger' | 'info';

export interface ToastRecord {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

export type ToastInput = Omit<ToastRecord, 'id'> & { id?: string };

const AUTO_DISMISS_MS = 5000;
const MAX_STACKED = 3;

// A tiny external store (no context provider needed) — `useToast()` and `<ToastRegion />` both
// subscribe to it, so `toast()` can be called from anywhere without wrapping the tree.
let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  return toasts;
}

let counter = 0;

/** Pushes a toast. Only actions whose result is off-screen should call this — on-screen results
 * (a rename, a completed generation) need no toast; ux-patterns.md §12.5. */
export function pushToast(input: ToastInput): string {
  const id = input.id ?? `toast-${(counter += 1)}`;
  // "max 3 stacked" — the newest 3 are shown; older ones roll off rather than queue silently.
  toasts = [...toasts.filter((t) => t.id !== id), { ...input, id }].slice(-MAX_STACKED);
  emit();
  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toast = useCallback((input: ToastInput) => pushToast(input), []);
  const dismiss = useCallback((id: string) => dismissToast(id), []);
  return { toasts: current, toast, dismiss };
}

const TONE_CLASSES: Record<ToastTone, string> = {
  neutral: 'border-[color:var(--color-ada-line)]',
  info: 'border-[color:var(--color-ada-line-strong)]',
  success: 'border-[color:rgb(52_211_153_/_0.4)]',
  danger: 'border-[color:rgb(251_113_133_/_0.4)]',
};

function ToastItem({ record }: { record: ToastRecord }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = setTimeout(() => dismissToast(record.id), AUTO_DISMISS_MS);
  }, [record.id]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  return (
    <div
      role="status"
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      className={cn(
        'glass-panel glass-sheen pointer-events-auto w-full max-w-sm rounded-lg px-4 py-3 text-sm text-ada-text',
        'animate-[ada-fade-in_var(--dur-3)_var(--ease-out)]',
        TONE_CLASSES[record.tone ?? 'neutral'],
      )}
    >
      <p className="font-medium">{record.title}</p>
      {record.description ? <p className="mt-0.5 text-ada-text-muted">{record.description}</p> : null}
    </div>
  );
}

/** Bottom-right (bottom-centre on mobile), auto-dismiss 5s, pause on hover, max 3 stacked,
 * `role="status"` per toast — ux-patterns.md §10.1. Mounted once, in `app/layout.tsx`. */
export function ToastRegion() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (current.length === 0) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4',
        'sm:inset-x-auto sm:right-4 sm:items-end',
      )}
    >
      {current.map((record) => (
        <ToastItem key={record.id} record={record} />
      ))}
    </div>
  );
}
