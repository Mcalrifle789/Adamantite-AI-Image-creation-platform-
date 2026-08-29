'use client';

import { cn } from '@/components/ui/utils';
import { formatBytes, MAX_ATTACHMENTS, type PromptAttachment } from './attachments';

export interface AttachmentTrayProps {
  attachments: readonly PromptAttachment[];
  onRemove: (id: string) => void;
  max?: number;
  className?: string;
}

/**
 * The row of attached references under a prompt box. Each chip carries the thumbnail, the file
 * name, and its own remove button — colour is never the only signal, and the count is announced
 * politely rather than stealing focus.
 *
 * `<img>` rather than `next/image`: these are runtime `data:` URLs from the user's disk, which
 * the Next image optimiser cannot fetch, size, or cache.
 */
export function AttachmentTray({ attachments, onRemove, max = MAX_ATTACHMENTS, className }: AttachmentTrayProps) {
  if (!attachments.length) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p aria-live="polite" className="px-1 text-xs text-ada-text-muted">
        {attachments.length} of {max} reference{attachments.length === 1 ? '' : 's'} attached
      </p>
      <ul className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <li
            key={attachment.id}
            className="glass-pill flex items-center gap-2 rounded-xl border border-[color:var(--glass-border)] py-1 pl-1 pr-1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- runtime data: URL, not an optimisable asset */}
            <img
              src={attachment.thumbUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
              width={36}
              height={36}
            />
            <span className="flex min-w-0 flex-col pr-1">
              <span className="max-w-[10rem] truncate text-xs text-ada-text" title={attachment.name}>
                {attachment.name}
              </span>
              <span className="font-mono text-2xs text-ada-text-muted">{formatBytes(attachment.size)}</span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              aria-label={`Remove ${attachment.name}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ada-text-muted transition duration-[var(--dur-1)] hover:bg-[rgb(251_113_133_/_0.14)] hover:text-ada-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ada-cyan-300"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
