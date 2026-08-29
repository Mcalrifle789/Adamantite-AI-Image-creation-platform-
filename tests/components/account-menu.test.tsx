import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountMenu } from '@/components/account/AccountMenu';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function renderWithQuery(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountMenu', () => {
  it('shows sign-in and registration links when the session endpoint returns signed out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'You are not signed in.',
              requestId: 'test',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    renderWithQuery(<AccountMenu />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
      expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
        'href',
        '/register',
      );
    });
  });

  it('still shows auth links when the session endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Session lookup failed.',
              requestId: 'test',
            },
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    renderWithQuery(<AccountMenu />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
        'href',
        '/register',
      );
    });
  });
});
