import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AttachButton } from '@/components/prompt/AttachButton';
import { AttachmentTray } from '@/components/prompt/AttachmentTray';
import { ACCEPT_ATTR, MAX_ATTACHMENTS, type PromptAttachment } from '@/components/prompt/attachments';

function attachment(id: string, name = `${id}.png`): PromptAttachment {
  return {
    id,
    name,
    mimeType: 'image/png',
    size: 2048,
    dataUrl: 'data:image/png;base64,AAA',
    thumbUrl: 'data:image/jpeg;base64,BBB',
  };
}

describe('AttachButton', () => {
  it('exposes an accessible name and opens the picker on click', async () => {
    const user = userEvent.setup();
    render(<AttachButton onFiles={vi.fn()} count={0} />);

    const button = screen.getByRole('button', { name: 'Attach reference images' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    await user.click(button);
    expect(click).toHaveBeenCalledOnce();
  });

  it('restricts the picker to decodable image types, not image/*', () => {
    render(<AttachButton onFiles={vi.fn()} count={0} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe(ACCEPT_ATTR);
    expect(input.accept).not.toContain('svg');
    expect(input.multiple).toBe(true);
  });

  it('reports progress towards the limit in its label', () => {
    render(<AttachButton onFiles={vi.fn()} count={2} />);
    expect(
      screen.getByRole('button', { name: `Attach reference images (2 of ${MAX_ATTACHMENTS} attached)` }),
    ).toBeInTheDocument();
  });

  it('disables itself at the limit and says why', () => {
    render(<AttachButton onFiles={vi.fn()} count={MAX_ATTACHMENTS} />);
    const button = screen.getByRole('button', {
      name: `Reference limit reached (${MAX_ATTACHMENTS} of ${MAX_ATTACHMENTS})`,
    });
    expect(button).toBeDisabled();
  });

  it('hands the picked files to its caller', async () => {
    const onFiles = vi.fn();
    const user = userEvent.setup();
    render(<AttachButton onFiles={onFiles} count={0} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'ref.png', { type: 'image/png' }));

    expect(onFiles).toHaveBeenCalledOnce();
    expect(onFiles.mock.calls[0]![0]![0]!.name).toBe('ref.png');
  });

  it('clears the input value so the same file can be picked twice in a row', async () => {
    const user = userEvent.setup();
    render(<AttachButton onFiles={vi.fn()} count={0} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'ref.png', { type: 'image/png' }));

    expect(input.value).toBe('');
  });
});

describe('AttachmentTray', () => {
  it('renders nothing when there is nothing attached', () => {
    const { container } = render(<AttachmentTray attachments={[]} onRemove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces the count politely rather than stealing focus', () => {
    render(<AttachmentTray attachments={[attachment('one')]} onRemove={vi.fn()} />);
    const status = screen.getByText(`1 of ${MAX_ATTACHMENTS} reference attached`);
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('pluralises the count', () => {
    render(<AttachmentTray attachments={[attachment('one'), attachment('two')]} onRemove={vi.fn()} />);
    expect(screen.getByText(`2 of ${MAX_ATTACHMENTS} references attached`)).toBeInTheDocument();
  });

  it('gives every reference its own named remove control', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <AttachmentTray
        attachments={[attachment('one', 'moodboard.png'), attachment('two', 'palette.png')]}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove palette.png' }));
    expect(onRemove).toHaveBeenCalledWith('two');
  });

  it('leaves the thumbnails out of the accessible tree — the file name already carries it', () => {
    render(<AttachmentTray attachments={[attachment('one', 'moodboard.png')]} onRemove={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('moodboard.png')).toBeInTheDocument();
  });
});
