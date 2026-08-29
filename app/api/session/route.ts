import { NextResponse } from 'next/server';

import { getCurrentAccount, toAccountSession } from '@/lib/server/auth/accounts';
import { clearSessionCookie } from '@/lib/server/auth/session';
import { apiError, apiOk } from '@/lib/server/http/respond';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `GET /api/session` — the endpoint `lib/client/queries/session.ts` has always pointed at.
 * 401 means "signed out", which the client treats as a normal state (it does not retry, and
 * renders the signed-out header rather than an error).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const row = await getCurrentAccount();
    if (!row) return apiError(401, 'UNAUTHENTICATED', 'You are not signed in.');
    return apiOk(toAccountSession(row));
  } catch (error) {
    console.error('[adamantite/auth] session lookup failed', error);
    return apiError(500, 'INTERNAL_ERROR', 'We could not load your session.');
  }
}

/** `DELETE /api/session` — sign out. */
export async function DELETE(): Promise<NextResponse> {
  await clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
