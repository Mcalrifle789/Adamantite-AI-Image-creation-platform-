/**
 * The single fetch wrapper every `lib/client/queries/*` hook calls through — api-contract.md §1.
 * `credentials: 'same-origin'` (the session cookie is `SameSite=Lax`), parses the contract's
 * error envelope into a typed `ApiError`, and attaches an `Idempotency-Key` (uuid v4) on
 * mutations that carry one. Callers branch on `error.code`, never on `error.message`.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly requestId: string;
  readonly status: number;

  constructor(shape: ApiErrorShape, status: number) {
    super(shape.message);
    this.name = 'ApiError';
    this.code = shape.code;
    this.details = shape.details;
    this.requestId = shape.requestId;
    this.status = status;
  }
}

export type ApiQueryValue = string | number | boolean | string[] | undefined;

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, ApiQueryValue>;
  /** Attaches a fresh `Idempotency-Key: <uuid v4>` header — required by the contract on
   * `POST /api/generations` and `POST /api/projects/{id}/messages`, optional (but honoured)
   * everywhere else a mutation hook opts in. */
  idempotent?: boolean;
  signal?: AbortSignal;
}

const API_BASE = '/api';

function buildPath(path: string, query?: Record<string, ApiQueryValue>): string {
  if (!query) return `${API_BASE}${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `${API_BASE}${path}?${search}` : `${API_BASE}${path}`;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback for environments without `crypto.randomUUID` (older WebViews).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** `204 No Content` and any other empty-body success response resolve to this instead of a
 * JSON-parse failure. */
export const NO_CONTENT = undefined;

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, idempotent, signal } = options;
  const headers: Record<string, string> = {};

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotent) headers['Idempotency-Key'] = generateIdempotencyKey();

  const response = await fetch(buildPath(path, query), {
    method,
    credentials: 'same-origin',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (response.status === 204) return NO_CONTENT as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const envelope = payload as { error?: ApiErrorShape } | undefined;
    if (envelope?.error) {
      throw new ApiError(envelope.error, response.status);
    }
    throw new ApiError(
      {
        code: 'UNKNOWN_ERROR',
        message: response.statusText || 'The request failed.',
        requestId: response.headers.get('x-request-id') ?? 'unknown',
      },
      response.status,
    );
  }

  return payload as T;
}
