import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

// Two environments under one `npm test` (technical_direction in T-001): `node` for lib/shared
// and lib/server, `jsdom` for components. `lib/server/**` starts every file with
// `import 'server-only'`, which throws unless resolved under the `react-server` export
// condition — Next.js sets that condition when bundling; the node project mirrors it here so
// server-only modules import cleanly under Vitest too.
export default defineConfig({
  resolve: {
    alias: {
      '@': root,
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: { '@': root },
          conditions: ['react-server'],
        },
        // Vitest transforms these files through Vite's SSR pipeline, which resolves against
        // `ssr.resolve.conditions` — not the client `resolve.conditions` above. Both are set so
        // `import 'server-only'` picks up its `react-server` export (an empty module) instead of
        // the throwing default, whichever pipeline a given file goes through.
        ssr: {
          resolve: {
            conditions: ['react-server'],
          },
        },
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'lib/shared/**/*.{test,spec}.ts',
            'lib/server/**/*.{test,spec}.ts',
            'tests/shared/**/*.{test,spec}.ts',
            'tests/server/**/*.{test,spec}.ts',
          ],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: { '@': root },
        },
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: [
            'components/**/*.{test,spec}.tsx',
            'app/**/*.{test,spec}.tsx',
            'tests/client/**/*.{test,spec}.tsx',
          ],
        },
      },
    ],
  },
});
