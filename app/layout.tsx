import type { Metadata } from 'next';

import { Atmosphere } from '@/components/background/Atmosphere';
import { RainField } from '@/components/background/RainField';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ToastRegion } from '@/components/ui/Toast';

import './globals.css';

export const metadata: Metadata = {
  title: 'Adamantite Agent',
  description: 'AI image and short-video generation.',
};

/**
 * The app shell — architecture.md §7 / ux-patterns.md §9. Mounts fonts, the token stylesheets
 * (via `globals.css`), `RainField` fixed at `z-0`, the TanStack Query provider, and the toast
 * region. Nothing else is global: the `<header>`/`<main>` landmarks belong to each route's own
 * page (T-007/T-008/T-009) — this file intentionally does not add a second `<main>` or a
 * generic wrapper landmark of its own, only a non-landmark `z-10` stacking context so route
 * content always paints above the rain field.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Atmosphere />
        <RainField />
        <QueryProvider>
          <div className="relative z-10">{children}</div>
          <ToastRegion />
        </QueryProvider>
      </body>
    </html>
  );
}
