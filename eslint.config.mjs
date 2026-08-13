import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next 16 ships native flat configs, so they are composed directly. FlatCompat is
// deliberately not used here: bridging these through eslintrc crashes the config validator on a
// circular plugin reference under ESLint 10.
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      '.agents/**',
      'data/**',
      'coverage/**',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Unused vars are an error, not a warning, so half-finished wiring cannot pass the gate;
      // `_`-prefixed names remain the escape hatch.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];

export default config;
