import { customAlphabet } from 'nanoid';

/**
 * Every entity id prefix in the system. See `.agents/design/api-contract.md` §1
 * ("Identifiers") and `.agents/design/data-model.md` §1.2.
 */
export const ID_PREFIXES = ['usr', 'sub', 'prj', 'gen', 'ast', 'msg', 'led'] as const;
export type IdPrefix = (typeof ID_PREFIXES)[number];

/** `<21 chars, [A-Za-z0-9_-]>` — api-contract.md §1. */
const RANDOM_PART_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-';
const RANDOM_PART_LENGTH = 21;
const RANDOM_PART_PATTERN = /^[A-Za-z0-9_-]{21}$/;

const generateRandomPart = customAlphabet(RANDOM_PART_ALPHABET, RANDOM_PART_LENGTH);

/**
 * Generates a new prefixed id, e.g. `newId('prj')` -> `"prj_V1StGXR8_Z5jdHi6B-myT"`.
 * Ids are opaque to the client — never parsed except by {@link parsePrefixedId}.
 */
export function newId(prefix: IdPrefix): string {
  return `${prefix}_${generateRandomPart()}`;
}

export interface ParsedId {
  prefix: IdPrefix;
  randomPart: string;
}

function isIdPrefix(value: string): value is IdPrefix {
  return (ID_PREFIXES as readonly string[]).includes(value);
}

/**
 * Parses and validates a `<prefix>_<21 chars>` id. Returns `null` — rather than throwing — on
 * anything malformed, so callers can turn an invalid id into a `404 NOT_FOUND` instead of a
 * 500. This is deliberately a guard, not an assertion.
 */
export function parsePrefixedId(value: string): ParsedId | null {
  const separatorIndex = value.indexOf('_');
  if (separatorIndex === -1) return null;

  const prefix = value.slice(0, separatorIndex);
  const randomPart = value.slice(separatorIndex + 1);

  if (!isIdPrefix(prefix) || !RANDOM_PART_PATTERN.test(randomPart)) return null;

  return { prefix, randomPart };
}
