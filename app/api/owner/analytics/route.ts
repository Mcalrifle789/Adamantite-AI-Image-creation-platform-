import { NextResponse } from 'next/server';

import {
  getCurrentAccount,
  getOwnerAnalytics,
  isOwnerAccount,
} from '@/lib/server/auth/accounts';
import { AuthConfigurationError } from '@/lib/server/auth/authEnv';
import { apiError, apiOk } from '@/lib/server/http/respond';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const account = await getCurrentAccount();
    if (!account) return apiError(401, 'UNAUTHENTICATED', 'You are not signed in.');
    if (!isOwnerAccount(account)) {
      return apiError(403, 'FORBIDDEN', 'Only the site owner can view analytics.');
    }
    return apiOk(await getOwnerAnalytics(account));
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return apiError(503, 'AUTH_NOT_CONFIGURED', error.message);
    }
    console.error('[adamantite/owner] analytics failed', error);
    return apiError(500, 'INTERNAL_ERROR', 'We could not load owner analytics.');
  }
}
