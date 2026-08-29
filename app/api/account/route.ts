import { NextResponse } from 'next/server';

import { getReadyAccountStore } from '@/lib/server/auth/accountStore';
import { getCurrentAccount, toAccountSession } from '@/lib/server/auth/accounts';
import { AuthConfigurationError } from '@/lib/server/auth/authEnv';
import { hashPassword, verifyPassword } from '@/lib/server/auth/password';
import { setSessionCookie } from '@/lib/server/auth/session';
import { EmailTakenError, type UpdateAccountPatch } from '@/lib/server/auth/types';
import { apiError, apiOk, readJsonBody, zodDetails } from '@/lib/server/http/respond';
import { updateAccountSchema } from '@/lib/shared/auth-schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** `GET /api/account` — the profile panel's data. Same payload as `GET /api/session`. */
export async function GET(): Promise<NextResponse> {
  const row = await getCurrentAccount();
  if (!row) return apiError(401, 'UNAUTHENTICATED', 'You are not signed in.');
  return apiOk(toAccountSession(row));
}

/**
 * `PATCH /api/account` — edit display name / email, or change password.
 *
 * A password change bumps `token_version`, which invalidates every session cookie ever issued
 * for this account, then immediately re-issues one for *this* browser. That is the intended
 * behaviour: changing your password should log out the other device you are worried about.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const row = await getCurrentAccount();
  if (!row) return apiError(401, 'UNAUTHENTICATED', 'You are not signed in.');

  const parsed = updateAccountSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', zodDetails(parsed.error));
  }

  const { displayName, email, currentPassword, newPassword } = parsed.data;
  const patch: UpdateAccountPatch = {};

  if (displayName !== undefined && displayName !== row.display_name) patch.display_name = displayName;
  if (email !== undefined && email !== row.email) patch.email = email;

  if (newPassword !== undefined) {
    if (!(await verifyPassword(currentPassword!, row.password_hash))) {
      return apiError(403, 'INVALID_CREDENTIALS', 'Your current password is not correct.', {
        fieldErrors: { currentPassword: 'That is not your current password.' },
      });
    }
    patch.password_hash = await hashPassword(newPassword);
    patch.token_version = row.token_version + 1;
  }

  if (Object.keys(patch).length === 0) return apiOk(toAccountSession(row));

  try {
    const store = await getReadyAccountStore();
    const updated = await store.update(row.id, patch);
    if (patch.token_version !== undefined) {
      await setSessionCookie(updated.id, updated.token_version);
    }
    return apiOk(toAccountSession(updated));
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return apiError(409, 'EMAIL_TAKEN', 'That email is already in use.', {
        fieldErrors: { email: 'That email is already in use by another account.' },
      });
    }
    if (error instanceof AuthConfigurationError) {
      return apiError(503, 'AUTH_NOT_CONFIGURED', error.message);
    }
    console.error('[adamantite/auth] account update failed', error);
    return apiError(500, 'INTERNAL_ERROR', 'We could not save your changes.');
  }
}
