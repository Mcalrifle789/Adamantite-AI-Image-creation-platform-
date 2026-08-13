import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/Button';

function classesOf(element: HTMLElement): string[] {
  return element.className.split(/\s+/).filter(Boolean);
}

describe('Button', () => {
  it('renders a real <button> by default', () => {
    render(<Button>Generate</Button>);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
  });

  it('ADR-06 refusal 3: the primary variant carries --color-ada-text-invert, never ada-text', () => {
    render(<Button variant="primary">Generate</Button>);
    const classes = classesOf(screen.getByRole('button', { name: 'Generate' }));
    expect(classes).toContain('text-ada-text-invert');
    expect(classes).not.toContain('text-ada-text');
  });

  it.each(['outline', 'secondary', 'danger'] as const)(
    'the %s variant never carries text-ada-text-invert (only blue-500 fills may)',
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      const classes = classesOf(screen.getByRole('button', { name: 'Go' }));
      expect(classes).not.toContain('text-ada-text-invert');
    },
  );

  it('the outline variant carries the plain ada-text label', () => {
    render(<Button variant="outline">Go</Button>);
    const classes = classesOf(screen.getByRole('button', { name: 'Go' }));
    expect(classes).toContain('text-ada-text');
  });

  it('keeps its width fixed while loading — the label stays in the layout, just invisible', () => {
    render(<Button loading>Generate</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    // Still present in the DOM (occupying layout), not swapped out.
    expect(screen.getByText('Generate')).toBeInTheDocument();
  });
});
