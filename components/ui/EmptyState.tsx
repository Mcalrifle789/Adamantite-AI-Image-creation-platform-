import type { ReactNode } from 'react';

import { cn } from './utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Icon slot + title + one sentence + one primary action — ux-patterns.md §10.1, §12.3. */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}>
      {icon ? (
        <div className="text-ada-text-faint" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="text-lg font-semibold text-ada-text">{title}</p>
      {body ? <p className="max-w-prose text-sm text-ada-text-muted">{body}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
