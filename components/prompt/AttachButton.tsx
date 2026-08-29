'use client';

import { useRef } from 'react';

import { cn } from '@/components/ui/utils';
import { ACCEPT_ATTR, MAX_ATTACHMENTS } from './attachments';

export interface AttachButtonProps {
  onFiles: (files: FileList | null) => void;
  /** How many are already attached — drives the label and the disabled state. */
  count: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * The `+` control that opens the OS file picker. A real `<input type="file">` does the opening —
 * there is no way to show the picker without one, and routing the click through a hidden input
 * keeps the keyboard and screen-reader path identical to the mouse path.
 */
export function AttachButton({ onFiles, count, max = MAX_ATTACHMENTS, disabled, className }: AttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFull = count >= max;
  const isDisabled = Boolean(disabled) || isFull;

  const label = isFull
    ? `Reference limit reached (${max} of ${max})`
    : count > 0
      ? `Attach reference images (${count} of ${max} attached)`
      : 'Attach reference images';

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          onFiles(event.target.files);
          // Picking the same file twice in a row fires no `change` event unless the value is
          // cleared first — the classic "re-attach the file I just removed" dead end.
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isDisabled}
        aria-label={label}
        title={label}
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-full',
          'border border-ada-cyan-300/35 bg-[rgb(34_211_238_/_0.08)] text-ada-cyan-200',
          'transition duration-[var(--dur-2)] ease-[var(--ease-out)]',
          'hover:border-ada-cyan-300/70 hover:bg-[rgb(34_211_238_/_0.2)] hover:text-white',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ada-cyan-300',
          'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-ada-cyan-300/35 disabled:hover:bg-[rgb(34_211_238_/_0.08)]',
          className,
        )}
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
