import { describe, expect, it } from 'vitest';

import { signInRedirect, workspacePath } from '@/lib/shared/authRedirect';

describe('workspacePath', () => {
  it('is just the project path when nothing was chosen', () => {
    expect(workspacePath('demo')).toBe('/workspace/demo');
  });

  it('carries the model and prompt the visitor had already picked', () => {
    expect(workspacePath('demo', { model: 'gpt-image-2', prompt: 'a neon koi' })).toBe(
      '/workspace/demo?model=gpt-image-2&prompt=a+neon+koi',
    );
  });

  it('omits empty values rather than emitting bare keys', () => {
    expect(workspacePath('demo', { model: '', prompt: '' })).toBe('/workspace/demo');
  });

  it('encodes a project id that would otherwise break the path', () => {
    expect(workspacePath('a/b?c')).toBe('/workspace/a%2Fb%3Fc');
  });
});

describe('signInRedirect', () => {
  it('encodes the return path so its query survives as one parameter', () => {
    const target = workspacePath('demo', { model: 'gpt-image-2', prompt: 'a neon koi' });
    const url = signInRedirect(target);

    expect(url).toBe('/signin?next=%2Fworkspace%2Fdemo%3Fmodel%3Dgpt-image-2%26prompt%3Da%2Bneon%2Bkoi');

    // The round trip is what matters: whatever `AuthForm` reads back must equal what we sent.
    const parsed = new URLSearchParams(url.slice(url.indexOf('?') + 1));
    expect(parsed.get('next')).toBe(target);
  });

  it('produces a path AuthForm will accept as same-origin', () => {
    const next = new URLSearchParams(signInRedirect(workspacePath('demo')).split('?')[1]).get('next')!;
    // AuthForm's rule: a single leading slash, never a protocol-relative `//host`.
    expect(next.startsWith('/')).toBe(true);
    expect(next.startsWith('//')).toBe(false);
  });
});
