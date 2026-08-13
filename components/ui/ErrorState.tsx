import type { ReactNode } from 'react';

import { cn } from './utils';

export interface ErrorStateProps {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  /** The stable `error.code` from the api-contract.md envelope, shown in mono so a bug report
   * is actionable — ux-patterns.md §10.1, §12.4. */
  code?: string;
  action?: ReactNode;
  className?: string;
}

/** Same shape as `EmptyState`, `danger` tone, and the error `code` in mono. */
export function ErrorState({ icon, title, body, code, action, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}
    >
      {icon ? (
        <div className="text-ada-danger" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="text-lg font-semibold text-ada-text">{title}</p>
      {body ? <p className="max-w-prose text-sm text-ada-text-muted">{body}</p> : null}
      {code ? (
        <p className="font-mono text-2xs uppercase tracking-[0.08em] text-ada-danger">{code}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
