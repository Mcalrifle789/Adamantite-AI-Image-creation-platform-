import { NextResponse } from 'next/server';

import { authenticate, toAccountSession } from '@/lib/server/auth/accounts';
import { AuthConfigurationError } from '@/lib/server/auth/authEnv';
import { setSessionCookie } from '@/lib/server/auth/session';
import { apiError, apiOk, readJsonBody, zodDetails } from '@/lib/server/http/respond';
import { loginSchema } from '@/lib/shared/auth-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `POST /api/auth/login`. Unknown email and wrong password return the *same* 401 with the same
 * message — anything more specific turns this endpoint into an account-enumeration oracle.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', zodDetails(parsed.error));
  }

  try {
    const row = await authenticate(parsed.data.email, parsed.data.password);
    if (!row) {
      return apiError(401, 'INVALID_CREDENTIALS', 'That email and password do not match an account.');
    }

    await setSessionCookie(row.id, row.token_version);
    return apiOk(toAccountSession(row));
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return apiError(503, 'AUTH_NOT_CONFIGURED', error.message);
    }
    console.error('[adamantite/auth] login failed', error);
    return apiError(500, 'INTERNAL_ERROR', 'We could not sign you in. Please try again.');
  }
}
