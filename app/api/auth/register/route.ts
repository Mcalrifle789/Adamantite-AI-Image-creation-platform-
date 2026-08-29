import { NextResponse } from 'next/server';

import { registerAccount, toAccountSession } from '@/lib/server/auth/accounts';
import { AuthConfigurationError } from '@/lib/server/auth/authEnv';
import { setSessionCookie } from '@/lib/server/auth/session';
import { EmailTakenError } from '@/lib/server/auth/types';
import { apiError, apiOk, readJsonBody, zodDetails } from '@/lib/server/http/respond';
import { registerSchema } from '@/lib/shared/auth-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** `POST /api/auth/register` — creates the account and signs the new user straight in. */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = registerSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', zodDetails(parsed.error));
  }

  try {
    const row = await registerAccount(parsed.data);
    await setSessionCookie(row.id, row.token_version);
    return apiOk(toAccountSession(row), 201);
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return apiError(409, 'EMAIL_TAKEN', 'An account with that email already exists.', {
        fieldErrors: { email: 'That email is already registered. Sign in instead.' },
      });
    }
    if (error instanceof AuthConfigurationError) {
      return apiError(503, 'AUTH_NOT_CONFIGURED', error.message);
    }
    console.error('[adamantite/auth] register failed', error);
    return apiError(500, 'INTERNAL_ERROR', 'We could not create your account. Please try again.');
  }
}
