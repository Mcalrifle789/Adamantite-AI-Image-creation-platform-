import Link from 'next/link';
import type { ReactNode } from 'react';

import { Wordmark } from '@/components/brand/Wordmark';

export interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * The framed card both auth pages sit in. A server component: it renders no interactive state
 * of its own, so only `AuthForm` inside it ships as client JavaScript.
 *
 * It reuses `.neon-bracket` from `styles/hud.css` rather than inventing a card treatment, so
 * the auth pages read as the same product as the studio.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center px-5 py-10 text-ada-text sm:px-8">
      <header className="glass-bar glass-sheen mb-10 flex w-full max-w-[92rem] items-center justify-between px-5 py-3">
        <Link href="/" aria-label="Adamantite Agent home" className="inline-flex items-center">
          <Wordmark size="header" withAgent={false} as="span" className="text-2xl" />
        </Link>
        <Link
          href="/"
          className="text-sm text-ada-text-muted underline decoration-white/25 underline-offset-4 transition hover:text-ada-text"
        >
          Back to home
        </Link>
      </header>

      <div className="neon-bracket w-full max-w-md p-7 sm:p-9">
        <span aria-hidden className="neon-bracket__corners" />
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ada-text">{title}</h1>
          <p className="prose-editorial mt-2 text-base text-ada-text-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
