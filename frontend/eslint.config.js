// ESLint flat config (required by ESLint 9+).
//
// Replaces the old .eslintrc.cjs that worked with ESLint 8. Same rules
// preserved; structure is the new flat-config array.
//
// Plugins:
//   - @eslint/js              JavaScript recommended rules
//   - typescript-eslint       TypeScript parser + recommended rules (combines
//                             the old @typescript-eslint/parser + plugin)
//   - eslint-plugin-react-hooks       React rules-of-hooks + exhaustive-deps
//   - eslint-plugin-react-refresh     Catches non-component exports that break HMR
//   - globals                 Browser globals (window, document, etc.)

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'public/mockServiceWorker.js',
      'coverage',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // Test files can use jest-style globals from Vitest.
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
