'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { useAccountSession, useLogout } from '@/lib/client/queries/account';
import { cn } from '@/components/ui/utils';
import { AccountAvatar } from './AccountAvatar';

export interface AccountMenuProps {
  className?: string;
  /** Shows the display name next to the avatar on wide viewports. Off in the workspace, where
   * the credit pill already occupies that space. */
  showName?: boolean;
}

const PLAN_ACCENT_CLASSES: Record<string, string> = {
  blue: 'border-ada-blue-400/45 text-ada-blue-300',
  cyan: 'border-ada-cyan-300/45 text-ada-cyan-200',
  purple: 'border-[rgb(167_139_250_/_0.45)] text-[rgb(196_181_253)]',
  magenta: 'border-[rgb(244_114_182_/_0.45)] text-[rgb(249_168_212)]',
};

/**
 * The top-right identity control on every page — signed out it is two links, signed in it is
 * the avatar plus a dropdown carrying the account summary and its actions.
 *
 * It mounts before the session query resolves, and during that first moment it renders a
 * fixed-size placeholder rather than the signed-out buttons: flashing "Sign in" at someone who
 * *is* signed in is the most jarring thing this component can do, and it would otherwise happen
 * on every hard navigation. The placeholder is also exactly the trigger's size, so the header
 * never reflows when the query lands.
 */
export function AccountMenu({ className, showName = true }: AccountMenuProps) {
  const { data: session, isError, isPending } = useAccountSession();
  const logout = useLogout();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function signOut() {
    close();
    try {
      await logout.mutateAsync();
    } catch {
      // A network failure leaves the session intact; the refresh below just re-renders the
      // still-signed-in header rather than pretending the sign-out worked.
    }
    router.push('/');
    router.refresh();
  }

  if (isPending) {
    return <div aria-hidden className={cn('h-11 w-11 rounded-full bg-white/5', className)} />;
  }

  if (isError || !session) {
    return <SignedOutLinks className={className} />;
  }

  const { account, plan } = session;

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border p-1 backdrop-blur-md',
          'transition duration-[var(--dur-2)] ease-[var(--ease-out)] hover:border-ada-cyan-300/50',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ada-cyan-300',
          open
            ? 'border-ada-cyan-300/60 bg-[rgb(20_34_58_/_0.55)] shadow-[0_0_22px_-4px_rgb(34_211_238_/_0.65)]'
            : 'border-white/12 bg-[rgb(16_24_39_/_0.42)]',
          showName && 'sm:pr-3',
        )}
      >
        <AccountAvatar initials={account.initials} seed={account.id} />
        {showName ? (
          <span className="hidden max-w-[9rem] truncate text-sm font-medium text-ada-text sm:inline">
            {account.displayName}
          </span>
        ) : null}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={cn(
            'mr-1.5 h-3 w-3 shrink-0 text-ada-text-muted transition-transform duration-[var(--dur-2)] ease-[var(--ease-spring)]',
            open && 'rotate-180 text-ada-cyan-300',
          )}
        >
          <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">Open account menu</span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label="Account"
          className="ada-menu absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--color-ada-line-strong)] bg-[rgb(9_14_24_/_0.94)] shadow-[0_24px_60px_-24px_rgb(0_0_0_/_0.9)] backdrop-blur-xl"
        >
          <div className="flex items-start gap-3 border-b border-white/10 p-4">
            <AccountAvatar
              initials={account.initials}
              seed={account.id}
              className="!h-11 !w-11 !text-sm"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ada-text">{account.displayName}</p>
              <p className="truncate text-xs text-ada-text-muted">{account.email}</p>
              <span
                className={cn(
                  'mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em]',
                  PLAN_ACCENT_CLASSES[plan.accent] ?? PLAN_ACCENT_CLASSES.cyan,
                )}
              >
                {plan.name} plan
              </span>
            </div>
          </div>

          <div className="p-1.5">
            {account.role === 'owner' ? (
              <MenuLink href="/owner" onNavigate={close} index={0}>
                Owner dashboard
              </MenuLink>
            ) : null}
            <MenuLink href="/account" onNavigate={close} index={1}>
              Account settings
            </MenuLink>
            <MenuLink href="/pricing" onNavigate={close} index={2}>
              Plans and billing
            </MenuLink>
          </div>

          <div className="border-t border-white/10 p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={logout.isPending}
              className="ada-menu__item w-full rounded-md px-3 py-2 text-left text-sm text-ada-danger transition hover:bg-[rgb(251_113_133_/_0.1)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ada-cyan-300 disabled:opacity-50"
              style={{ '--i': 3 } as CSSProperties}
            >
              {logout.isPending ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignedOutLinks({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 sm:gap-2', className)}>
      <Link
        href="/signin"
        className="rounded-full px-4 py-2 text-sm font-medium text-ada-text-muted transition hover:text-ada-text"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center gap-2 rounded-full border border-ada-cyan-300/45 bg-[rgb(34_211_238_/_0.08)] px-5 py-2 text-sm font-semibold text-ada-cyan-100 shadow-[0_0_24px_-8px_rgb(34_211_238_/_0.9)] backdrop-blur-md transition duration-[var(--dur-2)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-ada-cyan-300/70 hover:bg-[rgb(34_211_238_/_0.16)]"
      >
        Create account
      </Link>
    </div>
  );
}

function MenuLink({
  href,
  onNavigate,
  index,
  children,
}: {
  href: string;
  onNavigate: () => void;
  /** Stagger position for the menu's enter choreography (see `.ada-menu__item`). */
  index: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="ada-menu__item block rounded-md px-3 py-2 text-sm text-ada-text-muted transition hover:bg-white/10 hover:text-ada-text focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ada-cyan-300"
      style={{ '--i': index } as CSSProperties}
    >
      {children}
    </Link>
  );
}
