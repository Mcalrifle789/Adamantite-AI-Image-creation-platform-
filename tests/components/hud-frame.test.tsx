import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { HUD_INSET_FOCUS_RING, HudFrame } from '@/components/hud/HudFrame';

describe('HudFrame', () => {
  it('is never the focusable element itself', () => {
    render(
      <HudFrame>
        <button type="button" className={HUD_INSET_FOCUS_RING}>
          Inside
        </button>
      </HudFrame>,
    );
    const frame = screen.getByText('Inside').closest('.hud');
    expect(frame).not.toBeNull();
    expect(frame).not.toHaveAttribute('tabindex');
  });

  it('lets a focusable child render its own inset focus ring instead', async () => {
    const user = userEvent.setup();
    render(
      <HudFrame>
        <button type="button" className={HUD_INSET_FOCUS_RING}>
          Inside
        </button>
      </HudFrame>,
    );

    const button = screen.getByRole('button', { name: 'Inside' });
    await user.tab();

    expect(button).toHaveFocus();
    expect(button.className).toContain(
      'focus-visible:shadow-[inset_0_0_0_2px_var(--color-ada-cyan-300)]',
    );
  });

  it('renders bracket accents on the corners the chamfer does not cut', () => {
    const { container } = render(
      <HudFrame brackets corners={['tl', 'br']}>
        content
      </HudFrame>,
    );
    // Two brackets (tr, bl), each drawn as two bars (4 accent spans total).
    const accentSpans = container.querySelectorAll('span[aria-hidden="true"]');
    expect(accentSpans.length).toBe(2);
  });
});
