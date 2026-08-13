/**
 * Design adjudication D-01 (architecture.md §3): `lib/shared/**` is a leaf module. It must never
 * import from `lib/server`, `lib/client`, `components`, or `app` — that constraint is what lets
 * the same zod schema be used by a route handler and a form without dragging server code into
 * the client bundle. This test walks every source file under `lib/shared` and asserts it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../..');
const SHARED_DIR = path.join(REPO_ROOT, 'lib', 'shared');

const FORBIDDEN_ROOTS = [
  path.join(REPO_ROOT, 'lib', 'server'),
  path.join(REPO_ROOT, 'lib', 'client'),
  path.join(REPO_ROOT, 'components'),
  path.join(REPO_ROOT, 'app'),
];

const FORBIDDEN_BARE_SPECIFIERS = [
  /^lib\/server(\/|$)/,
  /^lib\/client(\/|$)/,
  /^components(\/|$)/,
  /^app(\/|$)/,
  /^@\/lib\/server(\/|$)/,
  /^@\/lib\/client(\/|$)/,
  /^@\/components(\/|$)/,
  /^@\/app(\/|$)/,
];

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractImportSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  const pattern =
    /\b(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier) specifiers.add(specifier);
  }
  return [...specifiers];
}

describe('lib/shared dependency direction (design adjudication D-01)', () => {
  const files = collectSourceFiles(SHARED_DIR);

  it('found shared-layer source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const relativeLabel = path.relative(REPO_ROOT, file).split(path.sep).join('/');

    it(`${relativeLabel} does not import lib/server, lib/client, components, or app`, () => {
      const source = readFileSync(file, 'utf8');
      const specifiers = extractImportSpecifiers(source);

      for (const specifier of specifiers) {
        const isForbiddenBare = FORBIDDEN_BARE_SPECIFIERS.some((pattern) => pattern.test(specifier));
        expect(
          isForbiddenBare,
          `${relativeLabel} imports forbidden module "${specifier}"`,
        ).toBe(false);

        if (specifier.startsWith('.')) {
          const resolved = path.resolve(path.dirname(file), specifier);
          const isForbiddenRelative = FORBIDDEN_ROOTS.some(
            (root) => resolved === root || resolved.startsWith(root + path.sep),
          );
          expect(
            isForbiddenRelative,
            `${relativeLabel} imports forbidden module "${specifier}" (resolves outside lib/shared)`,
          ).toBe(false);
        }
      }
    });
  }
});
