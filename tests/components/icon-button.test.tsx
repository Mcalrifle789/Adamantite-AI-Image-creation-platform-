import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IconButton } from '@/components/ui/IconButton';

describe('IconButton', () => {
  it('renders with the required aria-label as its accessible name', () => {
    render(
      <IconButton aria-label="Close">
        <svg aria-hidden="true" focusable="false">
          <path d="M0 0" />
        </svg>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  // `aria-label` is typed as required (not optional) on IconButtonProps — omitting it is a
  // compile-time error, verified by `tsc --noEmit` rather than at runtime here.
});
