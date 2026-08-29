/**
 * Building the `/signin?next=…` round trip. Shared rather than inlined at each guard so that the
 * encoding — the part that is easy to get subtly wrong — exists once and is tested once.
 *
 * `AuthForm` is the other half: it only honours a `next` that starts with a single `/`, so an
 * attacker-supplied `?next=https://evil.example` cannot turn sign-in into an open redirect.
 */

/** The URL a signed-out visitor is sent to, and which returns them to `path` afterwards. */
export function signInRedirect(path: string): string {
  return `/signin?next=${encodeURIComponent(path)}`;
}

/**
 * The workspace URL for a project, preserving whatever the visitor had already chosen on the
 * landing page. Keeping `model` and `prompt` through the sign-in bounce is what stops the guard
 * from feeling like it threw their work away — their references survive too, in sessionStorage.
 */
export function workspacePath(
  projectId: string,
  query: { model?: string; prompt?: string } = {},
): string {
  const params = new URLSearchParams();
  if (query.model) params.set('model', query.model);
  if (query.prompt) params.set('prompt', query.prompt);
  const search = params.toString();
  return `/workspace/${encodeURIComponent(projectId)}${search ? `?${search}` : ''}`;
}
