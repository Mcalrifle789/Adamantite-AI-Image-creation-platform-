/**
 * Account request bodies, shared by the route handlers (authoritative) and the sign-in /
 * register forms (fast feedback), exactly as `schemas.ts` documents for the rest of the API.
 * Leaf module — no `lib/server` or `lib/client` imports (design adjudication D-01).
 */

import { z } from 'zod';

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 60;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;
export const EMAIL_MAX_LENGTH = 254; // RFC 5321 line limit

/** Lower-cased and trimmed, because `lower(email)` is the uniqueness key in the database. */
export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Enter your email address.')
  .max(EMAIL_MAX_LENGTH, 'That email address is too long.')
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase());

/**
 * Length-only, plus a rejection of whitespace-only input. No character-class rules: NIST
 * SP 800-63B explicitly advises against composition requirements, which push people toward
 * `Password1!` rather than toward entropy.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, 'That password is too long.')
  .refine((value) => value.trim().length >= PASSWORD_MIN_LENGTH, 'Use at least 8 real characters.');

export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN_LENGTH, 'Enter a name of at least 2 characters.')
  .max(DISPLAY_NAME_MAX_LENGTH, 'That name is too long.')
  // Control characters would corrupt the header rendering; strip rather than reject so a
  // pasted name with a stray tab still succeeds.
  .transform((value) => value.replace(/[\u0000-\u001f\u007f]/g, '').trim());

export const registerSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(PASSWORD_MAX_LENGTH),
});

/** `PATCH /api/account` — every field optional; at least one is required by the route. */
export const updateAccountSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    email: emailSchema.optional(),
    currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine(
    (value) => value.newPassword === undefined || value.currentPassword !== undefined,
    { message: 'Enter your current password to set a new one.', path: ['currentPassword'] },
  );

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
