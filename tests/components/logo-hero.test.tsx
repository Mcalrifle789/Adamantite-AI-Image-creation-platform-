import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LogoHero } from '@/components/brand/LogoHero';

describe('LogoHero', () => {
  it('renders the keyed lockup art, decorated, sized for a 2x hero', () => {
    render(<LogoHero />);

    const img = screen.getByRole('presentation', { hidden: true });
    expect(img).toHaveAttribute('src', expect.stringContaining('adamantite-lockup'));
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '1600');
    expect(img).toHaveAttribute('height', '581');
    expect(img.parentElement).toHaveClass('ada-logo-hero');
  });

  it('exposes no accessible name — the page owns the sr-only h1', () => {
    render(<LogoHero />);

    // The wrapper is aria-hidden: announcing "Adamantite" here would double up with the
    // document h1 in app/page.tsx.
    expect(document.querySelector('.ada-logo-hero')).toHaveAttribute('aria-hidden', 'true');
  });
});
