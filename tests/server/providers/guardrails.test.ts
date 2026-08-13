import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Structural guardrails from T-003's acceptance criteria that no functional test would otherwise
 * catch:
 *  - every file under lib/server/providers/** starts with `import 'server-only'`
 *  - config/models.ts starts with `import 'server-only'`
 *  - nothing in providers/** or config/models.ts calls Date.now()
 *  - providers/** never imports credits/, services/, db/, app/, or components/
 */

const REPO_ROOT = path.resolve(__dirname, '../../..');
const PROVIDERS_DIR = path.join(REPO_ROOT, 'lib', 'server', 'providers');
const MODELS_FILE = path.join(REPO_ROOT, 'config', 'models.ts');

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.ts$/.test(entry.name)) {
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

const providerFiles = collectSourceFiles(PROVIDERS_DIR);
const allFiles = [...providerFiles, MODELS_FILE];

describe('lib/server/providers/** and config/models.ts start with import \'server-only\'', () => {
  it('found source files to check', () => {
    expect(providerFiles.length).toBeGreaterThan(0);
  });

  for (const file of allFiles) {
    const relativeLabel = path.relative(REPO_ROOT, file).split(path.sep).join('/');

    it(`${relativeLabel} begins with import 'server-only'`, () => {
      const source = readFileSync(file, 'utf8');
      const firstStatement = source
        .split('\n')
        .find((line) => line.trim().length > 0 && !line.trim().startsWith('//'));
      expect(firstStatement?.trim()).toBe("import 'server-only';");
    });
  }
});

describe('lib/server/providers/** and config/models.ts never call Date.now()', () => {
  for (const file of allFiles) {
    const relativeLabel = path.relative(REPO_ROOT, file).split(path.sep).join('/');

    it(`${relativeLabel} does not call Date.now()`, () => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/Date\.now\(/);
    });
  }
});

describe('lib/server/providers/** never imports credits/, services/, db/, app/, or components/', () => {
  const FORBIDDEN_BARE_SPECIFIERS = [
    /^lib\/server\/credits(\/|$)/,
    /^lib\/server\/services(\/|$)/,
    /^lib\/server\/db(\/|$)/,
    /^components(\/|$)/,
    /^app(\/|$)/,
    /^@\/lib\/server\/credits(\/|$)/,
    /^@\/lib\/server\/services(\/|$)/,
    /^@\/lib\/server\/db(\/|$)/,
    /^@\/components(\/|$)/,
    /^@\/app(\/|$)/,
  ];
  const FORBIDDEN_ROOTS = [
    path.join(REPO_ROOT, 'lib', 'server', 'credits'),
    path.join(REPO_ROOT, 'lib', 'server', 'services'),
    path.join(REPO_ROOT, 'lib', 'server', 'db'),
    path.join(REPO_ROOT, 'components'),
    path.join(REPO_ROOT, 'app'),
  ];

  for (const file of providerFiles) {
    const relativeLabel = path.relative(REPO_ROOT, file).split(path.sep).join('/');

    it(`${relativeLabel} imports nothing from credits/, services/, db/, app/, or components/`, () => {
      const source = readFileSync(file, 'utf8');
      const specifiers = extractImportSpecifiers(source);

      for (const specifier of specifiers) {
        const isForbiddenBare = FORBIDDEN_BARE_SPECIFIERS.some((pattern) => pattern.test(specifier));
        expect(isForbiddenBare, `${relativeLabel} imports forbidden module "${specifier}"`).toBe(
          false,
        );

        if (specifier.startsWith('.')) {
          const resolved = path.resolve(path.dirname(file), specifier);
          const isForbiddenRelative = FORBIDDEN_ROOTS.some(
            (root) => resolved === root || resolved.startsWith(root + path.sep),
          );
          expect(
            isForbiddenRelative,
            `${relativeLabel} imports forbidden module "${specifier}" (resolves outside its allowed scope)`,
          ).toBe(false);
        }
      }
    });
  }
});
