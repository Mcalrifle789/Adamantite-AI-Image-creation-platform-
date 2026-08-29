import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/lib/server/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** `POST /api/auth/logout` — clears the cookie. Always 204, even when already signed out. */
export async function POST(): Promise<NextResponse> {
  await clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
