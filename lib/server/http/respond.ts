import 'server-only';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * The error envelope from api-contract.md §1, which `lib/client/apiClient.ts` already parses:
 * `{ error: { code, message, details?, requestId } }`. Clients branch on `code`, never on
 * `message`, so codes here are stable identifiers and messages are free to be reworded.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  const requestId = randomUUID();
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message, ...(details ? { details } : {}), requestId } },
    { status, headers: { 'x-request-id': requestId } },
  );
}

export function apiOk<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status });
}

/** Rejects a malformed body before zod sees it, so a non-JSON POST is a 400, not a 500. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/** Flattens a zod error into `details.fieldErrors` for the form to render inline. */
export function zodDetails(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, unknown> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    fieldErrors[key] ??= issue.message;
  }
  return { fieldErrors };
}
